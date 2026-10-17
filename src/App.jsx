import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Users,UserRound,Play,Plus,Minus,Undo2,Flag,Save,Maximize2,X,RotateCcw,MonitorPlay} from 'lucide-react';

const URL=import.meta.env.VITE_SUPABASE_URL||'';
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||'';
const supabase=URL&&KEY?createClient(URL,KEY):null;
const today=()=>new Date().toISOString().slice(0,10);
const INITIAL={mode:'single',date:today(),players:[],inning:1,events:[],status:'ready'};
const safeNum=v=>Math.max(0,Number(v)||0);

export default function App(){
 const [screen,setScreen]=useState('start');
 const [players,setPlayers]=useState([]);
 const [loadingPlayers,setLoadingPlayers]=useState(false);
 const [game,setGame]=useState(()=>JSON.parse(localStorage.getItem('carom-score-live')||'null')||INITIAL);
 const [cameraFull,setCameraFull]=useState(false);
 const [notice,setNotice]=useState('');

 useEffect(()=>{localStorage.setItem('carom-score-live',JSON.stringify(game))},[game]);
 useEffect(()=>{if(screen==='setup') loadPlayers()},[screen]);
 async function loadPlayers(){
  if(!supabase){setNotice('Supabase 환경변수를 설정해 주세요.');return}
  setLoadingPlayers(true);
  const {data,error}=await supabase.from('players').select('*').eq('active',true).order('name');
  setLoadingPlayers(false);
  if(error){setNotice(`선수 조회 실패: ${error.message}`);return}
  setPlayers(data||[]);
 }
 function chooseMode(mode){setGame({...INITIAL,mode,date:today(),players:Array.from({length:mode==='single'?2:3},(_,i)=>({side:i,playerId:'',name:'',handicap:0,ball:i===0?'흰색':i===1?'노란색':'빨간색',score:0,hr:0,inningPoints:0}))});setScreen('setup')}
 function setPlayer(index,id){const p=players.find(x=>String(x.id)===String(id));setGame(g=>({...g,players:g.players.map((x,i)=>i===index?{...x,playerId:id,name:p?.name||'',handicap:Number(p?.handicap||0)}:x)}))}
 function start(){if(game.players.some(p=>!p.name)){setNotice('모든 선수를 선택해 주세요.');return}setNotice('');setGame(g=>({...g,status:'playing'}));setScreen('play')}
 function score(index,points){setGame(g=>{const ps=g.players.map((p,i)=>i===index?{...p,score:Math.max(0,p.score+points),inningPoints:Math.max(0,p.inningPoints+points),hr:Math.max(p.hr,p.inningPoints+points)}:p);return {...g,players:ps,events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:index,playerName:ps[index].name,points,at:new Date().toISOString()}]}})}
 function undo(){setGame(g=>{const events=[...g.events];const last=events.pop();if(!last)return g;const ps=g.players.map((p,i)=>i===last.playerIndex?{...p,score:Math.max(0,p.score-last.points),inningPoints:Math.max(0,p.inningPoints-last.points)}:p);return {...g,events,players:ps}})}
 function endInning(){setGame(g=>({...g,inning:g.inning+1,players:g.players.map(p=>({...p,inningPoints:0})),events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:-1,playerName:'이닝 종료',points:0,at:new Date().toISOString()}]}))}
 function avg(p){return (p.score/Math.max(1,game.inning)).toFixed(3)}
 function finish(){setScreen('result')}
 async function save(){
  if(game.mode!=='single'){setNotice('다인 경기 저장은 2차 개발에서 연결합니다.');return}
  if(!supabase){setNotice('Supabase 환경변수를 설정해 주세요.');return}
  const [a,b]=game.players;
  const payload={date:game.date,p1:a.name,ball1:a.ball,score1:a.score,hr1:a.hr,p2:b.name,ball2:b.ball,score2:b.score,hr2:b.hr,innings:game.inning};
  const {error}=await supabase.from('matches').insert(payload);
  if(error){setNotice(`저장 실패: ${error.message}`);return}
  localStorage.removeItem('carom-score-live');setScreen('saved');
 }
 function reset(){localStorage.removeItem('carom-score-live');setGame(INITIAL);setScreen('start');setNotice('')}
 const winner=useMemo(()=>game.players.reduce((best,p)=>!best||p.score>best.score?p:best,null),[game.players]);

 return <div className="app"><div className="stage">
  <header><b>CAROM AVG <span>SCORE</span></b><small>16:9 실시간 스코어보드</small></header>
  {notice&&<div className="notice">{notice}</div>}
  {screen==='start'&&<section className="start"><div className="hero"><div className="balls">⚪ 🟡 🔴</div><h1>CAROM AVG SCORE</h1><p>실제 경기의 흐름을 그대로, 쉽고 빠르게.</p></div><div className="start-actions"><button className="primary" onClick={()=>setScreen('mode')}><Play/> 새 경기 시작</button><button disabled={!localStorage.getItem('carom-score-live')} onClick={()=>setScreen('play')}><RotateCcw/> 진행 중 경기 불러오기</button></div></section>}
  {screen==='mode'&&<section className="center"><h1>경기 방식을 선택하세요</h1><div className="mode-grid"><button className="mode-card" onClick={()=>chooseMode('single')}><UserRound/><b>1 : 1 경기</b><span>두 선수의 일반 3쿠션 경기</span></button><button className="mode-card" onClick={()=>chooseMode('multi')}><Users/><b>다인 경기</b><span>3인 경기 1차 UI</span></button></div></section>}
  {screen==='setup'&&<section className="setup"><div className="section-title"><div><small>GAME SETUP</small><h1>선수와 경기 정보를 설정하세요</h1></div><input type="date" value={game.date} onChange={e=>setGame(g=>({...g,date:e.target.value}))}/></div><div className={`player-grid ${game.mode}`}>
   {game.players.map((p,i)=><article className="player-setup" key={i}><div className={`ball ${p.ball}`}></div><h2>{i===0?'선공':i===1?'후공':`${i+1}번 선수`}</h2><select value={p.playerId} onChange={e=>setPlayer(i,e.target.value)}><option value="">{loadingPlayers?'선수 불러오는 중...':'선수 선택'}</option>{players.map(x=><option key={x.id} value={x.id}>{x.name} · {x.handicap||0}점</option>)}</select><strong>핸디 {p.handicap||'--'}점</strong></article>)}
   </div><div className="setup-footer"><button onClick={()=>setScreen('mode')}>이전</button><button className="primary" onClick={start}>경기 시작</button></div></section>}
  {screen==='play'&&<section className="play"><div className="score-layout">
   <PlayerPanel p={game.players[0]} index={0} avg={avg(game.players[0])} onScore={score}/>
   <div className="center-live"><button className="camera" onClick={()=>setCameraFull(true)}><MonitorPlay/><b>카메라 / 15초 리플레이 예정 영역</b><span>클릭하면 전체 화면</span></button><div className="inning">현재 이닝 <b>{game.inning}</b></div><EventTable events={game.events} players={game.players}/></div>
   <PlayerPanel p={game.players[1]} index={1} avg={avg(game.players[1])} onScore={score}/>
   </div><div className="controls"><button onClick={undo}><Undo2/> 실행 취소</button><button onClick={endInning}><Flag/> 이닝 종료</button><button className="danger" onClick={finish}>경기 종료</button></div></section>}
  {screen==='result'&&<section className="result"><h1>경기 결과를 확인하세요</h1><div className="result-grid">{game.players.map((p,i)=><article key={i}><div className={`ball ${p.ball}`}></div><h2>{p.name}</h2><strong>{p.score}</strong><span>{p===winner?'승':'패'}</span><p>AVG {avg(p)} · HR {p.hr}</p></article>)}</div><div className="result-meta"><b>전체 이닝 {game.inning}</b><span>노란공 패배 시 기록 앱 계산에서 1이닝이 자동 차감됩니다.</span></div><div className="setup-footer"><button onClick={()=>setScreen('play')}>경기로 돌아가기</button><button className="primary" onClick={save}><Save/> 기록 앱에 저장</button></div></section>}
  {screen==='saved'&&<section className="saved"><div className="check">✓</div><h1>경기가 저장되었습니다!</h1><p>CAROM AVG 기록 앱에 경기 결과가 반영되었습니다.</p><button className="primary" onClick={reset}>새 경기 시작</button></section>}
  {cameraFull&&<div className="camera-full" onClick={()=>setCameraFull(false)}><button><X/></button><div><Maximize2/><h2>카메라 전체 화면</h2><p>2차 개발에서 RTSP / WebRTC 및 15초 리플레이를 연결합니다.</p></div></div>}
 </div></div>
}

function PlayerPanel({p,index,avg,onScore}){if(!p)return <aside/>;return <aside className="player-panel"><div className={`ball ${p.ball}`}></div><small>{index===0?'선공':'후공'}</small><h2>{p.name}</h2><em>핸디 {p.handicap}점</em><strong className="score">{p.score}</strong><div className="metrics"><span>AVG <b>{avg}</b></span><span>HR <b>{p.hr}</b></span><span>현재 <b>{p.inningPoints}</b></span></div><div className="score-buttons"><button className="minus" onClick={()=>onScore(index,-1)}><Minus/>1</button><button onClick={()=>onScore(index,1)}><Plus/>1</button><button className="plus2" onClick={()=>onScore(index,2)}><Plus/>2</button></div></aside>}
function EventTable({events,players}){const rows=events.filter(e=>e.playerIndex>=0).slice(-7).reverse();return <div className="event-box"><div className="event-head"><b>입력 이력</b><span>최근 입력 우선</span></div><div className="event-table"><div className="event-row title"><span>이닝</span><span>선수</span><span>득점</span><span>누적</span></div>{rows.map(e=><div className="event-row" key={e.id}><span>{e.inning}</span><span>{e.playerName}</span><b>{e.points>0?`+${e.points}`:e.points}</b><span>{players[e.playerIndex]?.score??0}</span></div>)}{!rows.length&&<p>점수를 입력하면 이력이 표시됩니다.</p>}</div></div>}
