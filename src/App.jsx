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
 useEffect(()=>{
  if(confirmDialog?.type!=='save')return;
  setSaveCountdown(5);
  const id=setInterval(()=>setSaveCountdown(v=>Math.max(0,v-1)),1000);
  return()=>clearInterval(id);
 },[confirmDialog?.type]);
 useEffect(()=>{
  if(confirmDialog?.type==='save'&&saveCountdown===0&&!saving){
   setConfirmDialog(null);
   saveMatch();
  }
 },[confirmDialog?.type,saveCountdown,saving]);

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
 function start(){if(game.players.some(p=>!p.name)){setNotice('모든 선수를 선택해 주세요.');return}if(new Set(game.players.map(p=>p.playerId)).size!==game.players.length){setNotice('같은 선수를 중복 선택할 수 없습니다.');return}setNotice('');setGame(g=>({...g,status:'playing',currentTurn:0}));setScreen('play')}
 function score(index,points){
  setGame(g=>{
   if(g.category==='record'&&g.mode==='single'&&index!==g.currentTurn)return g;
   const ps=g.players.map((p,i)=>i===index?{...p,score:Math.max(0,p.score+points),inningPoints:Math.max(0,p.inningPoints+points),hr:Math.max(p.hr,Math.max(0,p.inningPoints+points))}:p);
   const next={...g,players:ps,events:[...g.events,{id:crypto.randomUUID(),type:'score',inning:g.inning,playerIndex:index,playerName:ps[index].name,points,total:ps[index].score,at:new Date().toISOString()}]};
   if(g.category==='record'&&ps[index].handicap>0&&ps[index].score>=ps[index].handicap){setTimeout(()=>setScreen('result'),0)}
   return next;
  })
 }
 function undo(){setGame(g=>{const events=[...g.events];let last;while(events.length){const candidate=events.pop();if(candidate.type==='score'||candidate.playerIndex>=0){last=candidate;break}}if(!last)return g;const ps=g.players.map((p,i)=>i===last.playerIndex?{...p,score:Math.max(0,p.score-last.points),inningPoints:Math.max(0,p.inningPoints-last.points)}:p);return {...g,events,players:ps}})}
 function passTurn(){setGame(g=>{if(g.category!=='record'||g.mode!=='single')return g;const yellowEnding=g.currentTurn===1;const nextTurn=yellowEnding?0:1;return {...g,currentTurn:nextTurn,inning:yellowEnding?g.inning+1:g.inning,players:g.players.map((p,i)=>i===g.currentTurn?{...p,inningPoints:0}:p),events:[...g.events,{id:crypto.randomUUID(),type:'turn',inning:g.inning,playerIndex:g.currentTurn,playerName:g.players[g.currentTurn]?.name||'',points:0,total:g.players[g.currentTurn]?.score||0,at:new Date().toISOString()}]}})}
 function endInning(){setGame(g=>({...g,inning:g.inning+1,players:g.players.map(p=>({...p,inningPoints:0})),events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:-1,playerName:'이닝 종료',points:0,at:new Date().toISOString()}]}))}
 function avg(p){return (p.score/Math.max(1,game.inning)).toFixed(3)}
 function finish(){setScreen('result')}
 async function saveMatch(){
  if(saving)return;
  setSaving(true);
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

 function requestSave(){if(!saving){setSaveCountdown(5);setConfirmDialog({type:'save'})}}
 function requestReturn(){setConfirmDialog({type:'return'})}
 function requestHome(){setConfirmDialog({type:'home'})}
 function closeConfirm(){setConfirmDialog(null)}
 function confirmAction(){
  const type=confirmDialog?.type;
  setConfirmDialog(null);
  if(type==='save')saveMatch();
  if(type==='return')setScreen('play');
  if(type==='home')reset();
 }

 const winner=useMemo(()=>game.players.reduce((best,p)=>!best||p.score>best.score?p:best,null),[game.players]);

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
   {game.players.map((p,i)=><article className={`player-setup ${p.playerId?'selected':''}`} key={i}><div className={`ball ${p.ball}`}></div><h2>{game.mode==='multi'?`${i+1}번 선수`:i===0?'선공':'후공'}</h2><button type="button" className="player-picker-button" onClick={()=>setPickerIndex(i)}><UserCheck/><span><small>{loadingPlayers?'선수 불러오는 중...':p.playerId?'선택된 선수':'선수 선택'}</small><b>{p.name||'목록에서 선수를 선택하세요'}</b></span><em>{p.playerId?`${p.handicap||0}점`:'선택'}</em></button><strong>핸디 {p.playerId?(p.handicap||0):'--'}점</strong></article>)}
   </div>{game.category==='record'&&game.mode==='single'&&<div className="timer-setup"><div><b>턴 타이머</b><span>선수 차례마다 적용할 시간을 선택하세요.</span></div><div className="timer-presets">{[30,35,40,45].map(sec=><button key={sec} className={timerPreset===sec?'active':''} onClick={()=>setTimerPreset(sec)}>{sec}초</button>)}<button className={timerPreset==='custom'?'active':''} onClick={()=>setTimerPreset('custom')}>기타 설정</button></div>{timerPreset==='custom'&&<label className="custom-timer"><input type="number" min="5" max="300" value={customTimer} onChange={e=>setCustomTimer(e.target.value)} placeholder="초 입력"/><span>초</span><small>5초부터 300초까지 입력할 수 있습니다.</small></label>}</div>}<div className="setup-footer"><button onClick={()=>setScreen('mode')}>이전</button><button className="primary" onClick={start}>경기 시작</button></div></section>}
  {screen==='play'&&<Scoreboard game={game} onScore={score} onUndo={undo} onPassTurn={passTurn} onFinish={finish} onExit={()=>{if(window.confirm('진행 중인 경기에서 나가시겠습니까? 경기 내용은 저장됩니다.'))setScreen('start')}} avg={avg}/>}
  {screen==='result'&&<section className="result"><h1>경기 결과를 확인하세요</h1><div className={`result-grid ${game.mode==='multi'?'multi-result':''}`}>{game.players.map((p,i)=><article key={i}><div className={`ball ${p.ball}`}></div><h2>{p.name}</h2><strong>{p.score}</strong><span>{p===winner?'1위':game.mode==='single'?'패':'-'}</span><p>{game.mode==='single'?`AVG ${avg(p)} · HR ${p.hr}`:`최종 점수 ${p.score}`}</p></article>)}</div><div className="result-meta"><b>{game.mode==='multi'?`총 ${game.inning}라운드`:`전체 이닝 ${game.inning}`}</b><span>{game.category==='record'?'노란공 패배 시 기록 앱 계산에서 1이닝이 자동 차감됩니다.':'빠른 시작 경기는 기록 앱에 저장되지 않습니다.'}</span></div><div className="setup-footer"><button onClick={requestReturn}>경기로 돌아가기</button>{game.category==='record'?<button className="primary" onClick={requestSave} disabled={saving}><Save/> {saving?'저장 중...':'기록 앱에 저장'}</button>:<button className="primary" onClick={reset}><Play/> 새 경기 시작</button>}</div></section>}
  {screen==='saved'&&<section className="saved"><div className="check">✓</div><h1>경기가 저장되었습니다!</h1><p>CAROM AVG 기록 앱에 경기 결과가 반영되었습니다.</p><button className="primary" onClick={reset}>새 경기 시작</button></section>}
  {confirmDialog&&<div className="confirm-overlay" role="presentation"><section className={`confirm-modal ${confirmDialog.type}`} role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button type="button" className="confirm-close" onClick={closeConfirm} aria-label="닫기"><X/></button><div className="confirm-icon">{confirmDialog.type==='save'?<Save/>:confirmDialog.type==='return'?<RotateCcw/>:<Play/>}</div><h2 id="confirm-title">{confirmDialog.type==='save'?'경기 결과를 저장할까요?':confirmDialog.type==='return'?'경기 화면으로 돌아갈까요?':'첫 화면으로 이동할까요?'}</h2><p>{confirmDialog.type==='save'?<>경기 결과가 기록 앱에 저장됩니다.<br/><strong>{saveCountdown}초 후 자동으로 저장됩니다.</strong></>:confirmDialog.type==='return'?<>결과 화면을 닫고 경기 화면으로 돌아갑니다.<br/>수정 후 다시 경기 종료를 선택할 수 있습니다.</>:<>저장하지 않은 경기 결과는 사라집니다.<br/><strong>첫 화면으로 이동하시겠습니까?</strong></>}</p>{confirmDialog.type==='save'&&<div className="confirm-progress"><i style={{animationDuration:'5s'}}/></div>}<div className="confirm-actions"><button type="button" onClick={closeConfirm}>취소</button><button type="button" className="confirm-primary" onClick={confirmAction}>{confirmDialog.type==='save'?'지금 저장하기':confirmDialog.type==='return'?'경기 화면으로 돌아가기':'첫 화면으로 이동'}</button></div></section></div>}
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
