import React,{useEffect,useMemo,useState} from 'react';
import {createClient} from '@supabase/supabase-js';
import {CheckCircle2,Download,Users,UserRound,Play,Save,RotateCcw,X,UserCheck} from 'lucide-react';
import Scoreboard from './Scoreboard.jsx';
import './Scoreboard.css';
import LanguageSelector from './LanguageSelector.jsx';

const URL=import.meta.env.VITE_SUPABASE_URL||'';
const KEY=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY||'';
const supabase=URL&&KEY?createClient(URL,KEY):null;
const today=()=>new Date().toISOString().slice(0,10);
const INITIAL={category:'record',mode:'single',playerCount:3,date:today(),players:[],inning:1,currentTurn:0,timerSeconds:40,events:[],timeoutCount:2,timeoutVersion:0,status:'ready'};
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
 const [timeoutPreset,setTimeoutPreset]=useState(2);
 const [pickerIndex,setPickerIndex]=useState(null);
 const [dialog,setDialog]=useState(null);
 const [countdown,setCountdown]=useState(5);
 const [saving,setSaving]=useState(false);
 const [savedComplete,setSavedComplete]=useState(false);
 const [gameEndDelay,setGameEndDelay]=useState(null);
 const [installPrompt,setInstallPrompt]=useState(null);
 const [isStandalone,setIsStandalone]=useState(()=>window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true);
 const [installedKnown,setInstalledKnown]=useState(()=>localStorage.getItem('carom-score-installed')==='true');
 const [exitGuide,setExitGuide]=useState(false);
 const [appActionDialog,setAppActionDialog]=useState(null);
 const [uninstallGuide,setUninstallGuide]=useState(false);

 useEffect(()=>{localStorage.setItem('carom-score-live',JSON.stringify(game))},[game]);
 useEffect(()=>{
  const standalone=window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true;
  if(standalone){localStorage.setItem('carom-score-installed','true');setInstalledKnown(true);setIsStandalone(true)}
  const ready=e=>{e.preventDefault();setInstallPrompt(e)};
  const installed=()=>{localStorage.setItem('carom-score-installed','true');setInstalledKnown(true);setInstallPrompt(null)};
  window.addEventListener('beforeinstallprompt',ready);
  window.addEventListener('appinstalled',installed);
  return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',installed)};
 },[]);
 async function installApp(){
  if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;if(choice?.outcome==='accepted'){localStorage.setItem('carom-score-installed','true');setInstalledKnown(true)}setInstallPrompt(null);return}
  setNotice('설치 메뉴가 표시되지 않으면 브라우저 메뉴에서 홈 화면에 추가 또는 앱 설치를 선택해 주세요.');
 }
 function requestAppExit(){setAppActionDialog('exit')}
 function requestAppUninstall(){setAppActionDialog('uninstall')}
 function confirmAppAction(){
  const action=appActionDialog;
  setAppActionDialog(null);
  if(action==='exit'){
   setExitGuide(true);
   setTimeout(()=>{try{window.close()}catch{}},120);
  }
  if(action==='uninstall')setUninstallGuide(true);
 }
 function acknowledgeUninstall(){
  localStorage.removeItem('carom-score-installed');
  setInstalledKnown(false);
  setUninstallGuide(false);
 }

 useEffect(()=>{if(screen==='setup') loadPlayers()},[screen]);
 useEffect(()=>{
  if(!dialog||!['save','postSave'].includes(dialog))return;
  setCountdown(5);
  const id=setInterval(()=>setCountdown(v=>Math.max(0,v-1)),1000);
  return()=>clearInterval(id);
 },[dialog]);
 useEffect(()=>{
  if(countdown!==0)return;
  if(dialog==='save'){setDialog(null);saveMatch()}
  if(dialog==='postSave'){setDialog(null);reset()}
 },[countdown,dialog]);
 useEffect(()=>{
  if(!gameEndDelay)return;
  if(gameEndDelay.seconds<=0){setGameEndDelay(null);setScreen('result');return}
  const id=setTimeout(()=>setGameEndDelay(current=>current?{...current,seconds:current.seconds-1}:null),1000);
  return()=>clearTimeout(id);
 },[gameEndDelay]);

 async function loadPlayers(){
  if(!supabase){setNotice('Supabase 환경변수를 설정해 주세요.');return}
  setLoadingPlayers(true);
  const [{data:playerData,error:playerError},{data:matchData,error:matchError}]=await Promise.all([
   supabase.from('players').select('*').eq('active',true).order('name'),
   supabase.from('matches').select('p1_player_id,p2_player_id,winner_player_id,p1,p2,ball1,ball2,handicap1,handicap2,score1,score2,hr1,hr2,innings')
  ]);
  setLoadingPlayers(false);
  if(playerError){setNotice(`선수 조회 실패: ${playerError.message}`);return}
  if(matchError){setNotice(`통계 조회 실패: ${matchError.message}`);setPlayers(playerData||[]);return}
  setMatchHistory(matchData||[]);
  const stats=new Map();
  const add=(playerId,score,innings,hr,isWinner)=>{
   const key=String(playerId||'');
   if(!key)return;
   const prev=stats.get(key)||{points:0,innings:0,games:0,wins:0,hr:0};
   stats.set(key,{points:prev.points+(Number(score)||0),innings:prev.innings+(Number(innings)||0),games:prev.games+1,wins:prev.wins+(isWinner?1:0),hr:Math.max(prev.hr,Number(hr)||0)});
  };
  (matchData||[]).forEach(m=>{
   const fullInnings=Math.max(0,Number(m.innings)||0);
   const p1Id=String(m.p1_player_id||'');
   const p2Id=String(m.p2_player_id||'');
   const winnerId=String(m.winner_player_id||'');
   const innings1=m.ball1==='노란색'&&winnerId&&winnerId!==p1Id?Math.max(1,fullInnings-1):fullInnings;
   const innings2=m.ball2==='노란색'&&winnerId&&winnerId!==p2Id?Math.max(1,fullInnings-1):fullInnings;
   add(p1Id,m.score1,innings1,m.hr1,winnerId===p1Id);
   add(p2Id,m.score2,innings2,m.hr2,winnerId===p2Id);
  });
  setPlayers((playerData||[]).map(p=>{
   const stat=stats.get(String(p.id));
   return {...p,calculatedAvg:stat&&stat.innings>0?stat.points/stat.innings:null,winRate:stat?.games?stat.wins/stat.games*100:null,wins:stat?.wins||0,losses:stat?.games?stat.games-stat.wins:0,games:stat?.games||0,calculatedHr:stat?.hr||0};
  }));
 }
 function makePlayer(i,mode){return {side:i,playerId:'',name:'',handicap:0,ball:mode==='single'?(i===0?'흰색':'노란색'):'',score:0,hr:0,inningPoints:0,timeoutsUsed:0}}
 function continueMode(){
  const mode=category==='record'?'single':quickMode;
  const count=mode==='single'?2:playerCount;
  const nextPlayers=Array.from({length:count},(_,i)=>({
   ...makePlayer(i,mode),
   name:category==='quick'?`선수 ${i+1}`:'',
  }));
  const selectedTimer=timerPreset==='custom'?Math.min(300,Math.max(5,Number(customTimer)||40)):timerPreset;
  setGame({...INITIAL,category,mode,playerCount:count,date:today(),players:nextPlayers,currentTurn:0,timerSeconds:selectedTimer,timeoutCount:timeoutPreset,timeoutVersion:0,status:category==='quick'?'playing':'ready'});
  setNotice('');
  setScreen(category==='quick'?'play':'setup');
 }
 function setPlayer(index,id){const p=players.find(x=>String(x.id)===String(id));setGame(g=>({...g,players:g.players.map((x,i)=>i===index?{...x,playerId:String(p?.id||id),name:p?.name||'',handicap:Number(p?.handicap||0),calculatedAvg:p?.calculatedAvg??null,winRate:p?.winRate??null,wins:p?.wins||0,losses:p?.losses||0,games:p?.games||0,calculatedHr:p?.calculatedHr||0}:x)}));setPickerIndex(null)}
 function setStarter(index){setGame(g=>({...g,currentTurn:index,players:g.players.map((p,i)=>({...p,ball:i===index?'흰색':'노란색'}))}))}
 function start(){if(game.players.some(p=>!p.name)){setNotice('모든 선수를 선택해 주세요.');return}if(new Set(game.players.map(p=>p.playerId)).size!==game.players.length){setNotice('같은 선수를 중복 선택할 수 없습니다.');return}setNotice('');setGame(g=>({...g,status:'playing'}));setScreen('play')}
 function score(index,points){
  setGame(g=>{
   if(g.category==='record'&&g.mode==='single'&&index!==g.currentTurn)return g;
   const player=g.players[index];const raw=Math.max(0,player.score+points);const capped=g.category==='record'&&player.handicap>0?Math.min(player.handicap,raw):raw;const applied=capped-player.score;if(applied===0)return g;
   const ps=g.players.map((p,i)=>i===index?{...p,score:capped,inningPoints:Math.max(0,p.inningPoints+applied),hr:Math.max(p.hr,Math.max(0,p.inningPoints+applied))}:p);
   const next={...g,players:ps,events:[...g.events,{id:crypto.randomUUID(),type:'score',inning:g.inning,playerIndex:index,playerName:ps[index].name,points:applied,total:ps[index].score,at:new Date().toISOString()}]};
   if(g.category==='record'&&ps[index].handicap>0&&ps[index].score>=ps[index].handicap){setTimeout(()=>setGameEndDelay({name:ps[index].name,ball:ps[index].ball,score:ps[index].score,seconds:3}),0)}
   return next;
  })
 }
 function useTimeout(index){setGame(g=>{const p=g.players[index];const limit=Math.max(0,Number(g.timeoutCount)||0);if(!p||p.timeoutsUsed>=limit)return g;return {...g,timeoutVersion:(g.timeoutVersion||0)+1,players:g.players.map((x,i)=>i===index?{...x,timeoutsUsed:(x.timeoutsUsed||0)+1}:x)}})}
  function undo(){setGame(g=>{
  const events=[...g.events];
  const last=events.pop();
  if(!last)return g;
  if(last.type==='turn'){
   const previousTurn=Number(last.playerIndex);
   const inningWasAdvanced=g.players[previousTurn]?.ball==='노란색';
   return {...g,events,currentTurn:previousTurn,inning:inningWasAdvanced?Math.max(1,g.inning-1):g.inning};
  }
  if(last.type==='score'||last.playerIndex>=0){
   const ps=g.players.map((p,i)=>i===last.playerIndex?{...p,score:Math.max(0,p.score-last.points),inningPoints:Math.max(0,p.inningPoints-last.points)}:p);
   return {...g,events,players:ps};
  }
  return {...g,events};
 })}
 function changeStarter(){setGame(g=>{if(g.events.length)return g;const players=g.players.map(p=>({...p,ball:p.ball==='흰색'?'노란색':'흰색'}));const whiteIndex=players.findIndex(p=>p.ball==='흰색');return {...g,players,currentTurn:whiteIndex>=0?whiteIndex:0}})}
 function swapSeats(){setGame(g=>{if(g.events.length||g.players.length!==2)return g;const players=[g.players[1],g.players[0]].map((p,i)=>({...p,side:i}));const whiteIndex=players.findIndex(p=>p.ball==='흰색');return {...g,players,currentTurn:whiteIndex>=0?whiteIndex:0}})}
 function startScoreboard(){setGame(g=>{const whiteIndex=g.players.findIndex(p=>p.ball==='흰색');return {...g,currentTurn:whiteIndex>=0?whiteIndex:0,status:'playing'}})}
 function passTurn(){setGame(g=>{if(g.category!=='record'||g.mode!=='single')return g;const yellowEnding=g.players[g.currentTurn]?.ball==='노란색';const nextTurn=g.currentTurn===0?1:0;return {...g,currentTurn:nextTurn,inning:yellowEnding?g.inning+1:g.inning,players:g.players.map((p,i)=>i===g.currentTurn?{...p,inningPoints:0}:p),events:[...g.events,{id:crypto.randomUUID(),type:'turn',inning:g.inning,playerIndex:g.currentTurn,playerName:g.players[g.currentTurn]?.name||'',points:0,total:g.players[g.currentTurn]?.score||0,at:new Date().toISOString()}]}})}
 function endInning(){setGame(g=>({...g,inning:g.inning+1,players:g.players.map(p=>({...p,inningPoints:0})),events:[...g.events,{id:crypto.randomUUID(),inning:g.inning,playerIndex:-1,playerName:'이닝 종료',points:0,at:new Date().toISOString()}]}))}
 function avg(p){return (p.score/Math.max(1,game.inning)).toFixed(3)}
 function finish(){setScreen('result')}
 async function saveMatch(){
  if(saving||savedComplete)return;
  if(game.category!=='record'||game.mode!=='single'||!supabase)return;
  setSaving(true);
  const [a,b]=game.players;
  const winnerPlayer=game.players.find(p=>Number(p.handicap)>0&&Number(p.score)>=Number(p.handicap));
  const payload={date:game.date,p1_player_id:Number(a.playerId),p1:a.name,ball1:a.ball,handicap1:Number(a.handicap)||0,score1:a.score,hr1:a.hr,p2_player_id:Number(b.playerId),p2:b.name,ball2:b.ball,handicap2:Number(b.handicap)||0,score2:b.score,hr2:b.hr,winner_player_id:winnerPlayer?Number(winnerPlayer.playerId):null,innings:game.inning};
  const {error}=await supabase.from('matches').insert(payload);
  if(error){setNotice(`저장 실패: ${error.message}`);setSaving(false);return}
  setSaving(false);setSavedComplete(true);setDialog('postSave');
 }
 function reset(){localStorage.removeItem('carom-score-live');setGame(INITIAL);setSavedComplete(false);setSaving(false);setDialog(null);setCountdown(5);setScreen('start');setNotice('')}
 function ask(type){setCountdown(5);setDialog(type)}
 function confirmDialog(){const type=dialog;setDialog(null);if(type==='save')saveMatch();if(type==='return')setScreen('play');if(type==='home'||type==='exit'||type==='postSave')reset()}

 const winner=useMemo(()=>game.players.reduce((best,p)=>!best||p.score>best.score?p:best,null),[game.players]);
 const headToHead=useMemo(()=>{
  if(game.players.length<2||!game.players[0]?.playerId||!game.players[1]?.playerId)return null;
  const [a,b]=game.players;const aId=String(a.playerId),bId=String(b.playerId);let aw=0,bw=0,total=0,ap=0,bp=0,ai=0,bi=0,ahr=0,bhr=0;
  matchHistory.forEach(m=>{
   const p1Id=String(m.p1_player_id||''),p2Id=String(m.p2_player_id||'');
   const direct=p1Id===aId&&p2Id===bId,reverse=p1Id===bId&&p2Id===aId;
   if(!direct&&!reverse)return;
   total++;
   const aIsP1=direct;
   const as=Number(aIsP1?m.score1:m.score2)||0,bs=Number(aIsP1?m.score2:m.score1)||0;
   const aBall=aIsP1?m.ball1:m.ball2,bBall=aIsP1?m.ball2:m.ball1;
   const winnerId=String(m.winner_player_id||''),full=Math.max(0,Number(m.innings)||0);
   const aInn=aBall==='노란색'&&winnerId&&winnerId!==aId?Math.max(1,full-1):full;
   const bInn=bBall==='노란색'&&winnerId&&winnerId!==bId?Math.max(1,full-1):full;
   ap+=as;bp+=bs;ai+=aInn;bi+=bInn;ahr=Math.max(ahr,Number(aIsP1?m.hr1:m.hr2)||0);bhr=Math.max(bhr,Number(aIsP1?m.hr2:m.hr1)||0);
   if(winnerId===aId)aw++;else if(winnerId===bId)bw++;
  });
  if(screen==='result'&&!savedComplete){
   total++;const winnerPlayer=game.players.find(p=>Number(p.handicap)>0&&Number(p.score)>=Number(p.handicap));
   const winnerId=String(winnerPlayer?.playerId||'');const full=Math.max(0,Number(game.inning)||0);
   const aInn=a.ball==='노란색'&&winnerId&&winnerId!==aId?Math.max(1,full-1):full;
   const bInn=b.ball==='노란색'&&winnerId&&winnerId!==bId?Math.max(1,full-1):full;
   ap+=Number(a.score)||0;bp+=Number(b.score)||0;ai+=aInn;bi+=bInn;ahr=Math.max(ahr,Number(a.hr)||0);bhr=Math.max(bhr,Number(b.hr)||0);
   if(winnerId===aId)aw++;else if(winnerId===bId)bw++;
  }
  return {total,aw,bw,aAvg:ai?(ap/ai).toFixed(3):'-',bAvg:bi?(bp/bi).toFixed(3):'-',ahr,bhr};
 },[matchHistory,game.players,game.inning,screen,savedComplete]);
 return <div className="app"><div className="stage">
  {screen==='start'&&<LanguageSelector/>}
  {screen!=='play'&&<header><b>CAROM AVG <span>SCORE</span></b><small>16:9 실시간 스코어보드</small></header>}
  {notice&&<div className="notice">{notice}</div>}
  {screen==='start'&&<section className="start start-centered"><div className="start-app-controls">{isStandalone?<><button type="button" className="exit-app-button" onClick={requestAppExit}><X/><span><b>앱 종료하기</b><small>설치된 앱 닫기</small></span></button><button type="button" className="uninstall-app-button" onClick={requestAppUninstall}><Download/><span><b>앱 삭제</b><small>삭제 방법 확인</small></span></button></>:installedKnown?<div className="installed-app-status"><CheckCircle2/><span><b>앱이 설치되어 있습니다</b><small>홈 화면에서 전체 화면으로 실행할 수 있습니다</small></span></div>:<button type="button" className="install-app-button" onClick={installApp}><Download/><span><b>앱 설치</b><small>전체 화면으로 사용</small></span></button>}</div>
    <div className="hero start-hero">
      <div className="balls">⚪ 🟡 🔴</div>
      <h1>CAROM AVG SCORE</h1>
      <p>실제 경기의 흐름을 그대로, 쉽고 빠르게.</p>
    </div>
    <div className="start-actions start-actions-row main-start-panel">
      <button className="primary new-game-main" onClick={()=>setScreen('mode')}><Play/> 새 경기 시작</button>
      <section className="manager-intro" aria-label="CAROM AVG 기록 관리 앱 소개">
        <div className="manager-intro-head"><span className="manager-mark">AVG</span><div><small>CAROM AVG MANAGER</small><h2>회원가입 후 경기 기록을 관리하세요</h2></div></div>
        <p>선수별 AVG, 승률, 하이런과 상대전적을 한곳에서 확인할 수 있는 기록 관리 앱입니다.</p>
        <div className="manager-intro-actions">
          <a className="manager-signup" href="https://billiards-avg-manager.pages.dev" target="_blank" rel="noopener noreferrer"><UserRound/><span><b>회원가입</b><small>기록 관리 앱에서 시작하기</small></span></a>
          <a className="manager-github" href="https://billiards-avg-manager.pages.dev" target="_blank" rel="noopener noreferrer" title="Billiards-AVG-Manager 앱 실행"><span><b>앱 실행하기</b><small>Billiards-AVG-Manager 열기</small></span></a>
        </div>
      </section>
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
   {game.players.map((p,i)=><article className={`player-setup ${p.playerId?'selected':''} ${p.ball==='노란색'?'yellow-player':''}`} key={i}><div className={`ball ${p.ball}`}></div><h2>{game.mode==='multi'?`${i+1}번 선수`:i===0?'왼쪽 선수':'오른쪽 선수'}</h2><button type="button" className="player-picker-button" onClick={()=>setPickerIndex(i)}><UserCheck/><span><small>{loadingPlayers?'선수 불러오는 중...':p.playerId?'선택된 선수':'선수 선택'}</small><b>{p.name||'목록에서 선수를 선택하세요'}</b>{p.playerId&&<small className="player-main-meta">핸디 {p.handicap||0} · AVG {p.calculatedAvg!=null?Number(p.calculatedAvg).toFixed(3):'-'} · 승률 {p.winRate!=null?`${p.winRate.toFixed(1)}%`:'-'} · 누적 {p.wins||0}승 {p.losses||0}패</small>}</span><em>{p.playerId?`${p.handicap||0}점`:'선택'}</em></button><div className="setup-player-stats">{game.mode==='single'&&headToHead&&game.players.every(x=>x.playerId)&&<span>상대전적 <strong>{i===0?headToHead.aw:headToHead.bw}승 {i===0?headToHead.bw:headToHead.aw}패 · 승률 {headToHead.total?(((i===0?headToHead.aw:headToHead.bw)/headToHead.total)*100).toFixed(1):'0.0'}%</strong><br/>상대 AVG {i===0?headToHead.aAvg:headToHead.bAvg} · HR {i===0?headToHead.ahr:headToHead.bhr}</span>}</div>{game.mode==='single'&&<button type="button" className={`starter-button ${game.currentTurn===i?'active':''}`} disabled={!p.playerId} onClick={()=>setStarter(i)}>{game.currentTurn===i?'선공 · 흰공':'선공으로 선택'}</button>}</article>)}
   </div>{game.category==='record'&&game.mode==='single'&&<div className="timeout-setup"><div><b>타임아웃</b><span>선수별 사용 가능한 횟수를 선택하세요.</span></div><div className="timeout-presets">{[0,1,2,3,4].map(n=><button type="button" key={n} className={timeoutPreset===n?'active':''} onClick={()=>setTimeoutPreset(n)}>{n}개</button>)}</div></div>}{game.category==='record'&&game.mode==='single'&&<div className="timer-setup"><div><b>턴 타이머</b><span>선수 차례마다 적용할 시간을 선택하세요.</span></div><div className="timer-presets">{[30,35,40,45].map(sec=><button key={sec} className={timerPreset===sec?'active':''} onClick={()=>setTimerPreset(sec)}>{sec}초</button>)}<button className={timerPreset==='custom'?'active':''} onClick={()=>setTimerPreset('custom')}>기타 설정</button></div>{timerPreset==='custom'&&<label className="custom-timer"><input type="number" min="5" max="300" value={customTimer} onChange={e=>setCustomTimer(e.target.value)} placeholder="초 입력"/><span>초</span><small>5초부터 300초까지 입력할 수 있습니다.</small></label>}</div>}<div className="setup-footer"><button onClick={()=>setScreen('mode')}>이전</button><button className="primary" onClick={start}>경기 시작</button></div></section>}
  {screen==='play'&&<Scoreboard game={game} onScore={score} onUndo={undo} onPassTurn={passTurn} onTimeout={useTimeout} onChangeStarter={changeStarter} onSwapSeats={swapSeats} onStart={startScoreboard} onFinish={finish} onExit={()=>ask('exit')} avg={avg}/>}
  {screen==='result'&&<section className="result result-integrated"><h1>경기 결과를 확인하세요</h1><div className={`result-grid ${game.mode==='multi'?'multi-result':''}`}>{game.players.map((p,i)=>{const win=p===winner;return <article key={i} className={`${p.ball==='노란색'?'yellow-result':''}`}><div className={`ball ${p.ball}`}></div><h2>{p.name}</h2><strong>{p.score}</strong><span className={`result-badge ${game.mode==='single'?(win?'win':'loss'):''}`}>{game.mode==='single'?(win?'승':'패'):`${i+1}위`}</span><div className="result-stats"><b>AVG {avg(p)}</b><b>HR {p.hr}</b></div></article>})}</div>{game.mode==='single'&&headToHead&&<div className="result-h2h-live"><b>이번 경기 포함 상대전적</b><span>{game.players[0]?.name} <strong>{headToHead.aw}승</strong> · AVG {headToHead.aAvg} · HR {headToHead.ahr}</span><i>VS</i><span>{game.players[1]?.name} <strong>{headToHead.bw}승</strong> · AVG {headToHead.bAvg} · HR {headToHead.bhr}</span><small>총 {headToHead.total}경기</small></div>}<div className="result-highlight-message"><b>경기 기록이 새로운 기준이 됩니다.</b><span>결과를 저장하면 누적 AVG, 승률, HR과 상대전적에 자동 반영됩니다.</span></div><div className="result-save-area">{game.category==='record'?<button className={`result-save-button ${savedComplete?'completed':''}`} disabled={saving||savedComplete} onClick={()=>ask('save')}>{savedComplete?<><CheckCircle2/> 저장이 완료되었습니다</>:saving?<><Save/> 저장 중...</>:<><Save/> 기록 앱에 저장하기</>}</button>:<button className="result-save-button" onClick={reset}><Play/> 새 경기 시작</button>}<div className="result-return-buttons"><button onClick={()=>ask('return')}>경기로 돌아가기</button><button onClick={()=>ask('home')}>첫 화면으로 가기</button></div></div></section>}
  {gameEndDelay&&<div className="game-end-delay-overlay" role="status" aria-live="assertive"><section className={`game-end-delay-card ${gameEndDelay.ball==='노란색'?'yellow':''}`}><div className={`ball ${gameEndDelay.ball}`}></div><small>GAME FINISHED</small><h2>{gameEndDelay.name} 선수 승리</h2><strong>{gameEndDelay.score}</strong><p>최종 득점이 완료되었습니다.<br/>잠시 후 경기 결과 화면으로 이동합니다.</p><div className="game-end-delay-count"><b>{gameEndDelay.seconds}</b><span>초</span></div><div className="game-end-delay-progress"><i style={{width:`${(gameEndDelay.seconds/3)*100}%`}}/></div><button type="button" onClick={()=>{setGameEndDelay(null);setScreen('result')}}>결과 바로 보기</button></section></div>}
  {dialog&&<div className="confirm-overlay"><section className={`confirm-modal ${dialog}`} role="dialog" aria-modal="true"><button className="confirm-close" onClick={()=>setDialog(null)}><X/></button>{dialog==='postSave'&&<div className="save-return-check"><CheckCircle2/></div>}<h2>{dialog==='save'?'경기 결과를 저장할까요?':dialog==='postSave'?'경기 저장이 완료되었습니다':dialog==='return'?'경기 화면으로 돌아갈까요?':dialog==='exit'?'경기를 나갈까요?':'첫 화면으로 이동할까요?'}</h2><p>{dialog==='save'?<><strong>{countdown}초 후 자동 저장됩니다.</strong><br/>취소하면 결과 화면을 계속 볼 수 있습니다.</>:dialog==='postSave'?<><strong>{countdown}초 후 첫 화면으로 돌아갑니다.</strong><br/>취소하면 마지막 경기 결과를 계속 볼 수 있습니다.</>:dialog==='return'?'경기 결과를 수정할 수 있도록 경기 화면으로 돌아갑니다.':dialog==='exit'?'진행 중인 경기 내용은 기기에 유지됩니다.':'저장하지 않은 결과는 사라질 수 있습니다.'}</p>{['save','postSave'].includes(dialog)&&<div className="confirm-progress"><i/></div>}<div className="confirm-actions"><button onClick={()=>setDialog(null)}>{dialog==='postSave'?'취소하고 결과 계속 보기':'취소'}</button><button className="confirm-primary" onClick={confirmDialog}>{dialog==='save'?'지금 저장하기':dialog==='postSave'?'지금 첫 화면으로 가기':dialog==='return'?'경기로 돌아가기':dialog==='exit'?'경기 나가기':'첫 화면으로 이동'}</button></div></section></div>}
  {appActionDialog&&<div className="app-action-overlay"><section className={`app-action-modal ${appActionDialog}`} role="dialog" aria-modal="true"><button type="button" className="app-action-close" onClick={()=>setAppActionDialog(null)}><X/></button><h2>{appActionDialog==='exit'?'앱을 종료할까요?':'앱을 삭제할까요?'}</h2><p>{appActionDialog==='exit'?<>현재 화면을 닫고 앱을 종료합니다.<br/><strong>기기 정책에 따라 홈 버튼이나 앱 전환 화면이 필요할 수 있습니다.</strong></>:<>앱 삭제는 운영체제 또는 설치한 브라우저에서 진행됩니다.<br/><strong>확인을 누르면 기기에 맞는 삭제 방법을 안내합니다.</strong></>}</p><div className="app-action-buttons"><button type="button" onClick={()=>setAppActionDialog(null)}>취소</button><button type="button" className={appActionDialog==='exit'?'confirm-exit':'confirm-uninstall'} onClick={confirmAppAction}>{appActionDialog==='exit'?'앱 종료하기':'삭제 방법 보기'}</button></div></section></div>}
  {uninstallGuide&&<div className="uninstall-guide-overlay"><section className="uninstall-guide-modal" role="dialog" aria-modal="true"><button type="button" className="app-action-close" onClick={()=>setUninstallGuide(false)}><X/></button><h2>앱 삭제 방법</h2><div className="uninstall-steps"><p><b>Windows / Edge</b><span>앱 창 메뉴에서 앱 제거를 선택하거나, Windows 설정 → 앱 → 설치된 앱에서 CAROM AVG SCORE를 제거하세요.</span></p><p><b>Android</b><span>홈 화면의 앱 아이콘을 길게 누른 후 앱 정보 또는 제거를 선택하세요.</span></p><p><b>iPhone / iPad</b><span>홈 화면의 앱 아이콘을 길게 누르고 앱 제거 → 앱 삭제를 선택하세요.</span></p></div><small>웹 앱은 보안 정책상 앱 내부에서 운영체제의 설치 항목을 직접 삭제할 수 없습니다.</small><div className="uninstall-guide-actions"><button type="button" onClick={()=>setUninstallGuide(false)}>안내 닫기</button><button type="button" className="uninstall-done" onClick={acknowledgeUninstall}>삭제 완료 표시</button></div></section></div>}
  {exitGuide&&<div className="exit-guide-overlay"><section className="exit-guide-modal" role="dialog" aria-modal="true"><button type="button" className="exit-guide-close" onClick={()=>setExitGuide(false)}><X/></button><h2>앱 종료하기</h2><p>기기와 브라우저 정책에 따라 앱이 자동으로 닫히지 않을 수 있습니다.<br/><strong>홈 버튼 또는 앱 전환 화면을 사용해 앱을 종료해 주세요.</strong></p><button type="button" className="exit-guide-ok" onClick={()=>setExitGuide(false)}>확인</button></section></div>}
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
