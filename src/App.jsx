import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {Users,UserRound,Play,Save,RotateCcw,X,UserCheck} from 'lucide-react';
import Scoreboard from './Scoreboard.jsx';
import './Scoreboard.css';

const URL=import.meta.env.VITE_SUPABASE_URL||'';
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||'';
const supabase=URL&&KEY?createClient(URL,KEY):null;
const today=()=>new Date().toISOString().slice(0,10);
const INITIAL={category:'record',mode:'single',playerCount:3,date:today(),players:[],inning:1,currentTurn:0,timerSeconds:40,events:[],status:'ready'};
const safeNum=v=>Math.max(0,Number(v)||0);

export default function App(){
 const [screen,setScreen]=useState('start');
 const [players,setPlayers]=useState([]);
 const [matchHistory,setMatchHistory]=useState([]);
 const [loadingPlayers,setLoadingPlayers]=useState(false);
 const [game,setGame]=useState(()=>JSON.parse(localStorage.getItem('carom-score-live')||'null')||INITIAL);
 const [notice,setNotice]=useState('');
 const [category,setCategory]=useState('record');
 const [quickMode,setQuickMode]=useState('single');
 const [playerCount,setPlayerCount]=useState(3);
 const [timerPreset,setTimerPreset]=useState(40);
 const [customTimer,setCustomTimer]=useState('');
 const [pickerIndex,setPickerIndex]=useState(null);
 const [confirmDialog,setConfirmDialog]=useState(null);
 const [saveCountdown,setSaveCountdown]=useState(5);
 const [saving,setSaving]=useState(false);

 useEffect(()=>{localStorage.setItem('carom-score-live',JSON.stringify(game))},[game]);
 useEffect(()=>{if(screen==='setup') loadPlayers()},[screen]);
 useEffect(()=>{if(confirmDialog?.type!=='save')return;setSaveCountdown(5);const id=setInterval(()=>setSaveCountdown(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id)},[confirmDialog?.type]);
 useEffect(()=>{if(confirmDialog?.type==='save'&&saveCountdown===0&&!saving){setConfirmDialog(null);saveMatch()}},[confirmDialog?.type,saveCountdown,saving]);
 async function loadPlayers(){
  if(!supabase){setNotice('Supabase 환경변수를 설정해 주세요.');setSaving(false);return}
  setLoadingPlayers(true);
  const [{data:playerData,error:playerError},{data:matchData,error:matchError}]=await Promise.all([
   supabase.from('players').select('*').eq('active',true).order('name'),
   supabase.from('matches').select('p1,p2,score1,score2,innings')
  ]);
  setLoadingPlayers(false);
  if(playerError){setNotice(`선수 조회 실패: ${playerError.message}`);return}
  if(matchError){setNotice(`AVG 조회 실패: ${matchError.message}`);setPlayers(playerData||[]);return}
  setMatchHistory(matchData||[]);
  const stats=new Map();
  const add=(name,score,innings)=>{
   const key=String(name||'').trim();
   const point=Number(score)||0;
   const inning=Number(innings)||0;
   if(!key||inning<=0)return;
   const prev=stats.get(key)||{points:0,innings:0};
   stats.set(key,{points:prev.points+point,innings:prev.innings+inning});
  };
  (matchData||[]).forEach(m=>{
   const innings=Math.max(0,Number(m.innings)||0);
   add(m.p1,m.score1,innings);
   const yellowInnings=Number(m.score2)<Number(m.score1)?Math.max(1,innings-1):innings;
   add(m.p2,m.score2,yellowInnings);
  });
  setPlayers((playerData||[]).map(p=>{
   const stat=stats.get(String(p.name||'').trim());
   const calculatedAvg=stat&&stat.innings>0?stat.points/stat.innings:null;
   return {...p,calculatedAvg};
  }));
 }
 function makePlayer(i,mode){return {side:i,playerId:'',name:'',handicap:0,ball:mode==='single'?(i===0?'흰색':'노란색'):'',score:0,hr:0,inningPoints:0}}
 function continueMode(){
  const mode=category==='record'?'single':quickMode;
  const count=mode==='single'?2:playerCount;
  const nextPlayers=Array.from({length:count},(_,i)=>({
   ...makePlayer(i,mode),
   name:category==='quick'?`선수 ${i+1}`:'',
  }));
  const selectedTimer=timerPreset==='custom'?Math.min(300,Math.max(5,Number(customTimer)||40)):timerPreset;
  setGame({...INITIAL,category,mode,playerCount:count,date:today(),players:nextPlayers,currentTurn:0,timerSeconds:selectedTimer,status:category==='quick'?'playing':'ready'});
  setNotice('');
  setScreen(category==='quick'?'play':'setup');
 }
 function setPlayer(index,id){const p=players.find(x=>String(x.id)===String(id));setGame(g=>({...g,players:g.players.map((x,i)=>i===index?{...x,playerId:id,name:p?.name||'',handicap:Number(p?.handicap||0)}:x)}));setPickerIndex(null)}
 function setStarter(index){setGame(g=>({...g,currentTurn:index,players:g.players.map((p,i)=>({...p,ball:i===index?'흰색':'노란색'}))}))}
 function start(){if(game.players.some(p=>!p.name)){setNotice('모든 선수를 선택해 주세요.');return}if(new Set(game.players.map(p=>p.playerId)).size!==game.players.length){setNotice('같은 선수를 중복 선택할 수 없습니다.');return}setNotice('');setGame(g=>({...g,status:'playing'}));setScreen('play')}
 function score(index,points){
  setGame(g=>{
   if(g.category==='record'&&g.mode==='single'&&index!==g.currentTurn)return g;
   const player=g.players[index];const raw=Math.max(0,player.score+points);const capped=g.category==='record'&&player.handicap>0?Math.min(player.handicap,raw):raw;const applied=capped-player.score;if(!applied)return g;
   const ps=g.players.map((p,i)=>i===index?{...p,score:capped,inningPoints:Math.max(0,p.inningPoints+applied),hr:Math.max(p.hr,Math.max(0,p.inningPoints+applied))}:p);
   const next={...g,players:ps,events:[...g.events,{id:crypto.randomUUID(),type:'score',inning:g.inning,playerIndex:index,playerName:ps[index].name,points:applied,total:ps[index].score,at:new Date().toISOString()}]};
   if(g.category==='record'&&ps[index].handicap>0&&ps[index].score>=ps[index].handicap){setTimeout(()=>setScreen('result'),0)}
   return next;
  })
 }
 function undo(){setGame(g=>{const events=[...g.events];let last;while(events.length){const candidate=events.pop();if(candidate.type==='score'||candidate.playerIndex>=0){last=candidate;break}}if(!last)return g;const ps=g.players.map((p,i)=>i===last.playerIndex?{...p,score:Math.max(0,p.score-last.points),inningPoints:Math.max(0,p.inningPoints-last.points)}:p);return {...g,events,players:ps}})}
 function passTurn(){setGame(g=>{if(g.category!=='record'||g.mode!=='single')return g;const yellowEnding=g.players[g.currentTurn]?.ball==='노란색';const nextTurn=g.currentTurn===0?1:0;return {...g,currentTurn:nextTurn,inning:yellowEnding?g.inning+1:g.inning,players:g.players.map((p,i)=>i===g.currentTurn?{...p,inningPoints:0}:p),events:[...g.events,{id:crypto.randomUUID(),type:'turn',inning:g.inning,playerIndex:g.currentTurn,playerName:g.players[g.currentTurn]?.name||'',points:0,total:g.players[g.currentTurn]?.score||0,at:new Date().toISOString()}]}})}
 function endInning(){setGame(g=>({...g,inning:g.inning+1,players:g.players.map(p=>({...p,inningPoints:0})),events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:-1,playerName:'이닝 종료',points:0,at:new Date().toISOString()}]}))}
 function avg(p){return (p.score/Math.max(1,game.inning)).toFixed(3)}
 function beginScoreboard(){setGame(g=>{const i=g.players.findIndex(p=>p.ball==='흰색');return {...g,currentTurn:i>=0?i:0}})}
 function finish(){setScreen('result')}
 async function saveMatch(){if(saving)return;setSaving(true);
  if(game.category!=='record'){setNotice('빠른 시작 경기는 기록 앱에 저장되지 않습니다.');setSaving(false);return}
  if(game.mode!=='single'){setNotice('기록 경기는 1:1 경기만 저장할 수 있습니다.');setSaving(false);return}
  if(!supabase){setNotice('Supabase 환경변수를 설정해 주세요.');setSaving(false);return}
  const [a,b]=game.players;
  const payload={date:game.date,p1:a.name,ball1:a.ball,score1:a.score,hr1:a.hr,p2:b.name,ball2:b.ball,score2:b.score,hr2:b.hr,innings:game.inning};
  const {error}=await supabase.from('matches').insert(payload);
  if(error){setNotice(`저장 실패: ${error.message}`);setSaving(false);return}
  localStorage.removeItem('carom-score-live');setScreen('saved');setSaving(false);
 }
 function reset(){localStorage.removeItem('carom-score-live');setGame(INITIAL);setScreen('start');setNotice('')}
 function requestAction(type){setSaveCountdown(5);setConfirmDialog({type})}
 function closeConfirm(){setConfirmDialog(null)}
 function confirmAction(){const type=confirmDialog?.type;setConfirmDialog(null);if(type==='save')saveMatch();if(type==='return')setScreen('play');if(type==='home')reset()}

 const winner=useMemo(()=>game.players.reduce((best,p)=>!best||p.score>best.score?p:best,null),[game.players]);
 const headToHead=useMemo(()=>{if(game.mode!=='single'||game.players.length<2)return null;const [a,b]=game.players;let aWins=0,bWins=0,draws=0,total=0,aPoints=0,bPoints=0,aInnings=0,bInnings=0,aHr=0,bHr=0;matchHistory.forEach(m=>{const direct=m.p1===a.name&&m.p2===b.name,reverse=m.p1===b.name&&m.p2===a.name;if(!direct&&!reverse)return;total++;const as=Number(direct?m.score1:m.score2)||0,bs=Number(direct?m.score2:m.score1)||0,inn=Number(m.innings)||0,ah=Number(direct?m.hr1:m.hr2)||0,bh=Number(direct?m.hr2:m.hr1)||0;aPoints+=as;bPoints+=bs;aInnings+=inn;bInnings+=inn;aHr=Math.max(aHr,ah);bHr=Math.max(bHr,bh);if(as>bs)aWins++;else if(bs>as)bWins++;else draws++});return {total,aWins,bWins,draws,aAvg:aInnings?(aPoints/aInnings).toFixed(3):'-',bAvg:bInnings?(bPoints/bInnings).toFixed(3):'-',aHr,bHr}},[matchHistory,game.mode,game.players]);

 return <div className="app"><div className="stage">
  {screen!=='play'&&<header><b>CAROM AVG <span>SCORE</span></b><small>16:9 실시간 스코어보드</small></header>}
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
        <button className={category==='record'?'active':''} onClick={()=>{setCategory('record');setQuickMode('single')}}><Save/><span><b>기록 경기</b><small>선수를 선택하고 경기 종료 후 기록 앱에 저장합니다.</small></span></button>
        <button className={category==='quick'?'active':''} onClick={()=>{setCategory('quick');setQuickMode('single')}}><Play/><span><b>빠른 시작</b><small>선수 선택 없이 바로 시작하고 기록 앱에는 저장하지 않습니다.</small></span></button>
      </aside>
      <main className="choice-right">
        <div className="choice-right-title"><b>{category==='record'?'기록 경기':'빠른 시작'}</b><span>{category==='record'?'기록 경기는 1:1 경기만 가능합니다.':'선수 선택 없이 바로 진행할 경기 구성을 선택하세요.'}</span></div>
        <div className={`match-type-grid ${category==='record'?'single-only':''}`}>
          <button className={(category==='record'||quickMode==='single')?'active':''} onClick={()=>setQuickMode('single')}><UserRound/><b>1 : 1 경기</b><small>{category==='record'?'선수 선택 후 기록 앱에 저장':'선수 1 · 선수 2로 바로 시작'}</small></button>
          {category==='quick'&&<button className={quickMode==='multi'?'active':''} onClick={()=>setQuickMode('multi')}><Users/><b>다인 경기</b><small>선공·후공 없이 여러 명이 같은 방식으로 진행</small></button>}
        </div>
        {category==='quick'&&quickMode==='multi'&&<div className="multi-options single-option">
          <div className="option-block"><label>참가 선수 수</label><div className="count-buttons">{[3,4,5,6].map(n=><button key={n} className={playerCount===n?'active':''} onClick={()=>setPlayerCount(n)}>{n}명</button>)}</div><small>선수 선택 없이 선수 1, 선수 2 순서로 자동 구성됩니다.</small></div>
        </div>}
        <div className="quick-guide">{category==='record'?'선수와 핸디를 불러온 뒤 이닝·AVG·HR을 기록합니다.':'빠른 시작은 이닝·턴 진행 없이 점수 입력과 실행 취소만 사용합니다.'}</div>
        <div className="choice-footer"><button onClick={()=>setScreen('start')}>이전</button><button className="primary" onClick={continueMode}>{category==='record'?'선수 선택으로':'바로 시작'}</button></div>
      </main>
    </div>
  </section>}
  {screen==='setup'&&<section className="setup"><div className="section-title"><div><small>GAME SETUP</small><h1>{game.mode==='multi'?`${game.playerCount}명 다인 경기 선수 선택`:'선수와 경기 정보를 설정하세요'}</h1></div><input type="date" value={game.date} onChange={e=>setGame(g=>({...g,date:e.target.value}))}/></div><div className={`player-grid ${game.mode}`}>
   {game.players.map((p,i)=><article className={`player-setup ${p.playerId?'selected':''} ${p.ball==='노란색'?'yellow-player':''} ${p.playerId&&game.currentTurn===i?'starter-selected':''}`} key={i}><div className={`ball ${p.ball}`}></div><h2>{i===0?'왼쪽 선수':'오른쪽 선수'}</h2><button type="button" className="player-picker-button" onClick={()=>setPickerIndex(i)}><UserCheck/><span><small>{loadingPlayers?'선수 불러오는 중...':p.playerId?'선택된 선수':'선수 선택'}</small><b>{p.name||'목록에서 선수를 선택하세요'}</b></span><em>{p.playerId?`${p.handicap||0}점`:'선택'}</em></button><strong>핸디 {p.playerId?(p.handicap||0):'--'}점</strong><button type="button" className={`starter-button ${game.currentTurn===i?'active':''}`} disabled={!p.playerId} onClick={()=>setStarter(i)}>{game.currentTurn===i?'선공 · 흰공':'선공으로 선택'}</button></article>)}
   </div>{game.players.length===2&&game.players.every(p=>p.playerId)&&headToHead&&<div className="setup-h2h"><b>상대전적</b><span>{game.players[0].name} <strong>{headToHead.aWins}승 {headToHead.bWins}패</strong> · AVG {headToHead.aAvg} · HR {headToHead.aHr}</span><i>VS</i><span>{game.players[1].name} <strong>{headToHead.bWins}승 {headToHead.aWins}패</strong> · AVG {headToHead.bAvg} · HR {headToHead.bHr}</span><small>총 {headToHead.total}경기</small></div>}{game.category==='record'&&game.mode==='single'&&<div className="timer-setup"><div><b>턴 타이머</b><span>선수 차례마다 적용할 시간을 선택하세요.</span></div><div className="timer-presets">{[30,35,40,45].map(sec=><button key={sec} className={timerPreset===sec?'active':''} onClick={()=>setTimerPreset(sec)}>{sec}초</button>)}<button className={timerPreset==='custom'?'active':''} onClick={()=>setTimerPreset('custom')}>기타 설정</button></div>{timerPreset==='custom'&&<label className="custom-timer"><input type="number" min="5" max="300" value={customTimer} onChange={e=>setCustomTimer(e.target.value)} placeholder="초 입력"/><span>초</span><small>5초부터 300초까지 입력할 수 있습니다.</small></label>}</div>}<div className="setup-footer"><button onClick={()=>setScreen('mode')}>이전</button><button className="primary" onClick={start}>경기 시작</button></div></section>}
  {screen==='play'&&<Scoreboard game={game} onScore={score} onUndo={undo} onPassTurn={passTurn} onStart={beginScoreboard} onFinish={finish} onExit={()=>requestAction('exit')} avg={avg}/>}
  {screen==='result'&&<section className="result result-v22"><h1>경기 결과를 확인하세요</h1><div className="result-grid">{game.players.map((p,i)=>{const win=p===winner;return <article key={i} className={p.ball==='노란색'?'yellow-result':''}><div className={`ball ${p.ball}`}></div><h2>{p.name}</h2><strong>{p.score}</strong><span className={`result-badge ${win?'win':'loss'}`}>{win?'승':'패'}</span><div className="result-stats"><b>AVG {avg(p)}</b><b>HR {p.hr}</b></div></article>})}</div>{headToHead&&<div className="head-to-head-summary"><b>상대전적</b><span>{game.players[0]?.name} {headToHead.aWins}승 · AVG {headToHead.aAvg} · HR {headToHead.aHr}</span><i>VS</i><span>{game.players[1]?.name} {headToHead.bWins}승 · AVG {headToHead.bAvg} · HR {headToHead.bHr}</span><small>총 {headToHead.total}경기</small></div>}<div className="result-actions"><button className="save-result" onClick={()=>requestAction('save')}><Save/> 기록 앱에 저장하기</button><div className="result-secondary"><button onClick={()=>requestAction('return')}>경기로 돌아가기</button><button onClick={()=>requestAction('home')}>첫 화면으로 가기</button></div></div></section>}
  {screen==='saved'&&<section className="saved"><div className="check">✓</div><h1>경기가 저장되었습니다!</h1><p>CAROM AVG 기록 앱에 경기 결과가 반영되었습니다.</p><button className="primary" onClick={reset}>새 경기 시작</button></section>}
  {confirmDialog&&<div className="confirm-overlay"><section className={`confirm-modal ${confirmDialog.type}`}><button className="confirm-close" onClick={closeConfirm}><X/></button><h2>{confirmDialog.type==='save'?'경기 결과를 저장할까요?':confirmDialog.type==='return'?'경기 화면으로 돌아갈까요?':confirmDialog.type==='exit'?'경기를 나갈까요?':'첫 화면으로 이동할까요?'}</h2><p>{confirmDialog.type==='save'?<><strong>{saveCountdown}초 후 자동 저장됩니다.</strong><br/>지금 저장하거나 취소할 수 있습니다.</>:confirmDialog.type==='return'?'경기 결과를 수정할 수 있도록 경기 화면으로 돌아갑니다.':confirmDialog.type==='exit'?'진행 중인 경기 내용은 기기에 유지됩니다. 첫 화면으로 이동할까요?':'저장하지 않은 경기 결과는 사라집니다.'}</p>{confirmDialog.type==='save'&&<div className="confirm-progress"><i/></div>}<div className="confirm-actions"><button onClick={closeConfirm}>취소</button><button className="confirm-primary" onClick={()=>{if(confirmDialog.type==='exit'){closeConfirm();setScreen('start')}else confirmAction()}}>{confirmDialog.type==='save'?'지금 저장하기':confirmDialog.type==='return'?'경기로 돌아가기':confirmDialog.type==='exit'?'경기 나가기':'첫 화면으로 이동'}</button></div></section></div>}
  {pickerIndex!==null&&<PlayerPicker players={players} selectedIds={game.players.map(p=>String(p.playerId||''))} currentId={String(game.players[pickerIndex]?.playerId||'')} onSelect={id=>setPlayer(pickerIndex,id)} onClose={()=>setPickerIndex(null)}/>}
 </div></div>
}


function PlayerPicker({players,selectedIds,currentId,onSelect,onClose}){
 const formatAverage=p=>{
  const value=p.calculatedAvg??p.avg??p.average??p.current_avg??p.currentAverage;
  const number=Number(value);
  return value!==null&&value!==undefined&&value!==''&&Number.isFinite(number)?number.toFixed(3):'-';
 };
 return <div className="player-picker-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="player-picker-modal" role="dialog" aria-modal="true" aria-label="선수 선택"><header><div><small>PLAYER SELECT</small><h2>선수를 선택하세요</h2></div><div className="player-count">총 {players.length}명</div><button type="button" onClick={onClose} aria-label="닫기"><X/></button></header><div className="player-picker-list">{players.map(p=>{const id=String(p.id);const used=selectedIds.includes(id)&&id!==currentId;return <button type="button" key={id} disabled={used} className={id===currentId?'current':''} onClick={()=>onSelect(p.id)}><b>{p.name}</b>{p.nick&&<small>{p.nick}</small>}<strong>AVG {formatAverage(p)}</strong><em>핸디 {p.handicap||0}점</em>{used&&<i>선택됨</i>}</button>})}{!players.length&&<div className="player-empty">등록된 선수가 없습니다.</div>}</div><footer><span>선수 이름, AVG와 핸디를 확인한 뒤 선택하세요.</span><button type="button" onClick={onClose}>취소</button></footer></section></div>
}
