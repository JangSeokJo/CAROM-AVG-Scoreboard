import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Users,UserRound,Play,Plus,Minus,Undo2,Flag,Save,Maximize2,X,RotateCcw,MonitorPlay} from 'lucide-react';

const URL=import.meta.env.VITE_SUPABASE_URL||'';
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||'';
const supabase=URL&&KEY?createClient(URL,KEY):null;
const today=()=>new Date().toISOString().slice(0,10);
const INITIAL={category:'quick',mode:'single',multiRule:'jookbbang',playerCount:3,date:today(),players:[],inning:1,events:[],status:'ready'};
const safeNum=v=>Math.max(0,Number(v)||0);

export default function App(){
 const [screen,setScreen]=useState('start');
 const [players,setPlayers]=useState([]);
 const [loadingPlayers,setLoadingPlayers]=useState(false);
 const [game,setGame]=useState(()=>JSON.parse(localStorage.getItem('carom-score-live')||'null')||INITIAL);
 const [cameraFull,setCameraFull]=useState(false);
 const [notice,setNotice]=useState('');
 const [category,setCategory]=useState('quick');
 const [quickMode,setQuickMode]=useState('single');
 const [playerCount,setPlayerCount]=useState(3);
 const [multiRule,setMultiRule]=useState('jookbbang');

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
 function makePlayer(i,mode){return {side:i,playerId:'',name:'',handicap:0,ball:mode==='single'?(i===0?'흰색':'노란색'):'',score:0,hr:0,inningPoints:0}}
 function continueMode(){
  const mode=category==='record'?'single':quickMode;
  const count=mode==='single'?2:playerCount;
  setGame({...INITIAL,category,mode,multiRule:mode==='multi'?multiRule:'',playerCount:count,date:today(),players:Array.from({length:count},(_,i)=>makePlayer(i,mode))});
  setNotice('');
  setScreen('setup');
 }
 function setPlayer(index,id){const p=players.find(x=>String(x.id)===String(id));setGame(g=>({...g,players:g.players.map((x,i)=>i===index?{...x,playerId:id,name:p?.name||'',handicap:Number(p?.handicap||0)}:x)}))}
 function start(){if(game.players.some(p=>!p.name)){setNotice('모든 선수를 선택해 주세요.');return}if(new Set(game.players.map(p=>p.playerId)).size!==game.players.length){setNotice('같은 선수를 중복 선택할 수 없습니다.');return}setNotice('');setGame(g=>({...g,status:'playing'}));setScreen('play')}
 function score(index,points){setGame(g=>{const ps=g.players.map((p,i)=>i===index?{...p,score:Math.max(0,p.score+points),inningPoints:Math.max(0,p.inningPoints+points),hr:Math.max(p.hr,p.inningPoints+points)}:p);return {...g,players:ps,events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:index,playerName:ps[index].name,points,at:new Date().toISOString()}]}})}
 function undo(){setGame(g=>{const events=[...g.events];const last=events.pop();if(!last)return g;const ps=g.players.map((p,i)=>i===last.playerIndex?{...p,score:Math.max(0,p.score-last.points),inningPoints:Math.max(0,p.inningPoints-last.points)}:p);return {...g,events,players:ps}})}
 function endInning(){setGame(g=>({...g,inning:g.inning+1,players:g.players.map(p=>({...p,inningPoints:0})),events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:-1,playerName:'이닝 종료',points:0,at:new Date().toISOString()}]}))}
 function avg(p){return (p.score/Math.max(1,game.inning)).toFixed(3)}
 function finish(){setScreen('result')}
 async function save(){
  if(game.category!=='record'){setNotice('빠른 시작 경기는 기록 앱에 저장되지 않습니다.');return}
  if(game.mode!=='single'){setNotice('기록 경기는 1:1 경기만 저장할 수 있습니다.');return}
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
  {screen==='start'&&<section className="start start-centered">
    <div className="hero start-hero">
      <div className="balls">⚪ 🟡 🔴</div>
      <h1>CAROM AVG SCORE</h1>
      <p>실제 경기의 흐름을 그대로, 쉽고 빠르게.</p>
    </div>
    <div className="start-actions start-actions-row">
      <button className="primary" onClick={()=>setScreen('mode')}><Play/> 새 경기 시작</button>
      <button disabled={!localStorage.getItem('carom-score-live')} onClick={()=>setScreen('play')}><RotateCcw/> 진행 중 경기 불러오기</button>
    </div>
  </section>}
  {screen==='mode'&&<section className="game-choice">
    <div className="choice-heading"><small>NEW GAME</small><h1>시작 방식을 선택하세요</h1><p>왼쪽에서 경기 목적을 고른 뒤, 오른쪽에서 경기 구성을 선택하세요.</p></div>
    <div className="choice-columns">
      <aside className="choice-left">
        <button className={category==='quick'?'active':''} onClick={()=>{setCategory('quick');setQuickMode('single')}}><Play/><span><b>빠른 시작</b><small>기록 앱에 저장하지 않고 바로 경기합니다.</small></span></button>
        <button className={category==='record'?'active':''} onClick={()=>{setCategory('record');setQuickMode('single')}}><Save/><span><b>기록 경기</b><small>경기 종료 후 CAROM AVG 기록 앱에 저장합니다.</small></span></button>
      </aside>
      <main className="choice-right">
        <div className="choice-right-title"><b>{category==='quick'?'빠른 시작':'기록 경기'}</b><span>{category==='quick'?'경기 구성을 선택하세요.':'기록 경기는 1:1 경기만 가능합니다.'}</span></div>
        <div className="match-type-grid">
          <button className={(category==='record'||quickMode==='single')?'active':''} onClick={()=>setQuickMode('single')}><UserRound/><b>1 : 1 경기</b><small>{category==='record'?'경기 결과를 기록 앱에 저장':'두 선수가 빠르게 경기'}</small></button>
          {category==='quick'&&<button className={quickMode==='multi'?'active':''} onClick={()=>setQuickMode('multi')}><Users/><b>다인 경기</b><small>3명 이상이 함께 진행</small></button>}
        </div>
        {category==='quick'&&quickMode==='multi'&&<div className="multi-options">
          <div className="option-block"><label>참가 선수 수</label><div className="count-buttons">{[3,4,5,6].map(n=><button key={n} className={playerCount===n?'active':''} onClick={()=>setPlayerCount(n)}>{n}명</button>)}</div><small>다인 경기는 선공·후공 구분 없이 선택한 인원 순서로 표시됩니다.</small></div>
          <div className="option-block"><label>다인 경기 방식</label><button className="rule-card active" onClick={()=>setMultiRule('jookbbang')}><b>죽빵 경기</b><span>선수별 점수를 올리고 내리며 진행하는 빠른 다인 경기</span></button></div>
        </div>}
        <div className="choice-footer"><button onClick={()=>setScreen('start')}>이전</button><button className="primary" onClick={continueMode}>선수 선택으로</button></div>
      </main>
    </div>
  </section>}
  {screen==='setup'&&<section className="setup"><div className="section-title"><div><small>GAME SETUP</small><h1>{game.mode==='multi'?`${game.playerCount}명 죽빵 경기 선수 선택`:'선수와 경기 정보를 설정하세요'}</h1></div><input type="date" value={game.date} onChange={e=>setGame(g=>({...g,date:e.target.value}))}/></div><div className={`player-grid ${game.mode}`}>
   {game.players.map((p,i)=><article className="player-setup" key={i}><div className={`ball ${p.ball}`}></div><h2>{game.mode==='multi'?`${i+1}번 선수`:i===0?'선공':'후공'}</h2><select value={p.playerId} onChange={e=>setPlayer(i,e.target.value)}><option value="">{loadingPlayers?'선수 불러오는 중...':'선수 선택'}</option>{players.map(x=><option key={x.id} value={x.id}>{x.name} · {x.handicap||0}점</option>)}</select><strong>핸디 {p.handicap||'--'}점</strong></article>)}
   </div><div className="setup-footer"><button onClick={()=>setScreen('mode')}>이전</button><button className="primary" onClick={start}>경기 시작</button></div></section>}
  {screen==='play'&&game.mode==='single'&&<section className="play"><div className="score-layout">
   <PlayerPanel p={game.players[0]} index={0} avg={avg(game.players[0])} onScore={score}/>
   <div className="center-live"><button className="camera" onClick={()=>setCameraFull(true)}><MonitorPlay/><b>카메라 / 15초 리플레이 예정 영역</b><span>클릭하면 전체 화면</span></button><div className="inning">현재 이닝 <b>{game.inning}</b></div><EventTable events={game.events} players={game.players}/></div>
   <PlayerPanel p={game.players[1]} index={1} avg={avg(game.players[1])} onScore={score}/>
   </div><div className="controls"><button onClick={undo}><Undo2/> 실행 취소</button><button onClick={endInning}><Flag/> 이닝 종료</button><button className="danger" onClick={finish}>경기 종료</button></div></section>}
  {screen==='play'&&game.mode==='multi'&&<section className="multi-play"><div className="multi-play-head"><div><small>QUICK · 죽빵 경기</small><h1>{game.playerCount}명 다인 경기</h1></div><div className="inning">진행 라운드 <b>{game.inning}</b></div></div><div className={`multi-score-grid count-${game.playerCount}`}>{game.players.map((p,i)=><MultiPlayerPanel key={i} p={p} index={i} onScore={score}/>)}</div><div className="multi-bottom"><EventTable events={game.events} players={game.players}/><div className="multi-controls"><button onClick={undo}><Undo2/> 실행 취소</button><button onClick={endInning}><Flag/> 다음 라운드</button><button className="danger" onClick={finish}>경기 종료</button></div></div></section>}
  {screen==='result'&&<section className="result"><h1>경기 결과를 확인하세요</h1><div className={`result-grid ${game.mode==='multi'?'multi-result':''}`}>{game.players.map((p,i)=><article key={i}><div className={`ball ${p.ball}`}></div><h2>{p.name}</h2><strong>{p.score}</strong><span>{p===winner?'1위':game.mode==='single'?'패':'-'}</span><p>{game.mode==='single'?`AVG ${avg(p)} · HR ${p.hr}`:`최종 점수 ${p.score}`}</p></article>)}</div><div className="result-meta"><b>{game.mode==='multi'?`총 ${game.inning}라운드`:`전체 이닝 ${game.inning}`}</b><span>{game.category==='record'?'노란공 패배 시 기록 앱 계산에서 1이닝이 자동 차감됩니다.':'빠른 시작 경기는 기록 앱에 저장되지 않습니다.'}</span></div><div className="setup-footer"><button onClick={()=>setScreen('play')}>경기로 돌아가기</button>{game.category==='record'?<button className="primary" onClick={save}><Save/> 기록 앱에 저장</button>:<button className="primary" onClick={reset}><Play/> 새 경기 시작</button>}</div></section>}
  {screen==='saved'&&<section className="saved"><div className="check">✓</div><h1>경기가 저장되었습니다!</h1><p>CAROM AVG 기록 앱에 경기 결과가 반영되었습니다.</p><button className="primary" onClick={reset}>새 경기 시작</button></section>}
  {cameraFull&&<div className="camera-full" onClick={()=>setCameraFull(false)}><button><X/></button><div><Maximize2/><h2>카메라 전체 화면</h2><p>2차 개발에서 RTSP / WebRTC 및 15초 리플레이를 연결합니다.</p></div></div>}
 </div></div>
}

function MultiPlayerPanel({p,index,onScore}){return <article className="multi-player-panel"><div className="multi-player-order">{index+1}</div><h2>{p.name}</h2><small>핸디 {p.handicap}점</small><strong>{p.score}</strong><div><button className="minus" onClick={()=>onScore(index,-1)}><Minus/>1</button><button className="plus" onClick={()=>onScore(index,1)}><Plus/>1</button></div></article>}

function PlayerPanel({p,index,avg,onScore}){if(!p)return <aside/>;return <aside className="player-panel"><div className={`ball ${p.ball}`}></div><small>{index===0?'선공':'후공'}</small><h2>{p.name}</h2><em>핸디 {p.handicap}점</em><strong className="score">{p.score}</strong><div className="metrics"><span>AVG <b>{avg}</b></span><span>HR <b>{p.hr}</b></span><span>현재 <b>{p.inningPoints}</b></span></div><div className="score-buttons"><button className="minus" onClick={()=>onScore(index,-1)}><Minus/>1</button><button onClick={()=>onScore(index,1)}><Plus/>1</button><button className="plus2" onClick={()=>onScore(index,2)}><Plus/>2</button></div></aside>}
function EventTable({events,players}){const rows=events.filter(e=>e.playerIndex>=0).slice(-7).reverse();return <div className="event-box"><div className="event-head"><b>입력 이력</b><span>최근 입력 우선</span></div><div className="event-table"><div className="event-row title"><span>이닝</span><span>선수</span><span>득점</span><span>누적</span></div>{rows.map(e=><div className="event-row" key={e.id}><span>{e.inning}</span><span>{e.playerName}</span><b>{e.points>0?`+${e.points}`:e.points}</b><span>{players[e.playerIndex]?.score??0}</span></div>)}{!rows.length&&<p>점수를 입력하면 이력이 표시됩니다.</p>}</div></div>}
