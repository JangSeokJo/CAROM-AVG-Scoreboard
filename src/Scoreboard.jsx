import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Clock3,Flag,Maximize2,Minus,MonitorPlay,Plus,Undo2,X} from 'lucide-react';

export default function Scoreboard({game,onScore,onUndo,onPassTurn,onFinish,onExit,avg}){
 const isRecord=game.category==='record'&&game.mode==='single';
 const [seconds,setSeconds]=useState(Number(game.timerSeconds)||40);
 const [cameraFull,setCameraFull]=useState(false);
 const logRef=useRef(null);
 useEffect(()=>{setSeconds(Number(game.timerSeconds)||40)},[game.currentTurn,game.timerSeconds]);
 useEffect(()=>{if(!isRecord)return;const id=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id)},[isRecord,game.currentTurn,game.timerSeconds]);
 useEffect(()=>{const el=logRef.current;if(el)el.scrollTop=el.scrollHeight},[game.events.length,game.inning]);
 if(game.mode==='multi')return <MultiScoreboard game={game} onScore={onScore} onUndo={onUndo} onFinish={onFinish} onExit={onExit}/>;
 const timerClass=seconds<=5?'danger':seconds<=15?'warning':'normal';
 return <section className="scoreboard-screen">
  <button className="exit-game" onClick={onExit}><ArrowLeft/> 경기 나가기</button>
  <div className="sb-grid">
   <PlayerCard player={game.players[0]} index={0} active={!isRecord||game.currentTurn===0} yellow={false} avg={avg(game.players[0])} onScore={onScore} quick={!isRecord}/>
   <main className="sb-center">
    {isRecord&&<button className="pass-turn-hero" onClick={onPassTurn}><Flag/><span><b>턴 넘기기</b><small>{game.currentTurn===0?'노란공 선수 차례로 이동':'다음 이닝의 흰공 선수 차례로 이동'}</small></span></button>}
    <button className="sb-camera" onClick={()=>setCameraFull(true)}><MonitorPlay/><b>카메라 / 15초 리플레이 예정 영역</b><span>클릭하면 전체 화면</span></button>
    <div className="status-row">
     {isRecord&&<div className="timer-card"><div className={`timer-ring ${timerClass}`} style={{'--progress':`${seconds/(Number(game.timerSeconds)||40)*360}deg`}}><strong>{seconds}</strong><small>초</small></div><span><Clock3/> {game.currentTurn===0?'흰공':'노란공'} 선수 차례</span></div>}
     {isRecord&&<div className="inning-card"><small>CURRENT INNING</small><strong>{game.inning}</strong><span>{game.currentTurn===0?'흰공 선수 진행':'노란공 선수 진행'}</span></div>}
    </div>
    <InningHistory events={game.events} players={game.players} currentInning={game.inning} quick={!isRecord} scrollRef={logRef}/>
   </main>
   <PlayerCard player={game.players[1]} index={1} active={!isRecord||game.currentTurn===1} yellow avg={avg(game.players[1])} onScore={onScore} quick={!isRecord}/>
  </div>
  <div className={`sb-controls ${isRecord?'record':'quick'}`}>
   <button onClick={onUndo}><Undo2/> 실행 취소</button>
   <button className="finish-small" onClick={onFinish}>경기 종료</button>
  </div>
  {cameraFull&&<div className="camera-overlay"><button onClick={()=>setCameraFull(false)}><X/></button><div onClick={()=>setCameraFull(false)}><Maximize2/><h2>카메라 전체 화면</h2><p>카메라 연결 단계에서 실시간 영상과 15초 리플레이가 표시됩니다.</p></div></div>}
 </section>
}

function PlayerCard({player,index,active,yellow,avg,onScore,quick}){
 if(!player)return <aside/>;
 return <aside className={`sb-player ${yellow?'yellow':''} ${active?'active':'inactive'}`}>
  <div className={`ball ${player.ball}`}></div>
  <small>{quick?`선수 ${index+1}`:index===0?'흰공 · 선공':'노란공 · 후공'}</small>
  <h2>{player.name}</h2>
  {!quick&&<em>핸디 {player.handicap}점</em>}
  <strong className="sb-score">{player.score}</strong>
  <div className="sb-metrics">{!quick&&<span>AVG <b>{avg}</b></span>}<span>HR <b>{player.hr}</b></span>{!quick&&<span>현재 <b>{player.inningPoints}</b></span>}</div>
  <div className="sb-score-buttons"><button disabled={!active} className="minus" onClick={()=>onScore(index,-1)}><Minus/>1</button><button disabled={!active} onClick={()=>onScore(index,1)}><Plus/>1</button><button disabled={!active} className="plus2" onClick={()=>onScore(index,2)}><Plus/>2</button></div>
 </aside>
}

function InningHistory({events,players,currentInning,quick,scrollRef}){
 const rows=useMemo(()=>{
  const scoreEvents=events.filter(e=>e.type==='score'||(!e.type&&e.playerIndex>=0));
  if(quick)return scoreEvents.map((e,i)=>({key:e.id,inning:i+1,white:e.playerIndex===0?e.points:'',yellow:e.playerIndex===1?e.points:'',name:e.playerName,total:e.total}));
  const map=new Map();
  scoreEvents.forEach(e=>{
   if(!map.has(e.inning))map.set(e.inning,{inning:e.inning,white:0,yellow:0});
   const row=map.get(e.inning);
   if(e.playerIndex===0)row.white+=Number(e.points)||0;
   if(e.playerIndex===1)row.yellow+=Number(e.points)||0;
  });
  if(!map.has(currentInning))map.set(currentInning,{inning:currentInning,white:0,yellow:0});
  return [...map.values()].sort((a,b)=>a.inning-b.inning);
 },[events,currentInning,quick]);
 if(quick)return <div className="sb-history"><div className="sb-history-head"><b>입력 이력</b><span>과거 → 최신</span></div><div className="sb-history-table" ref={scrollRef}><div className="sb-history-row title"><span>순서</span><span>선수</span><span>득점</span><span>누적</span></div>{rows.map(r=><div className="sb-history-row" key={r.key}><span>{r.inning}</span><span>{r.name}</span><b>{r.white!==''?r.white:r.yellow}</b><span>{r.total??'-'}</span></div>)}</div></div>;
 return <div className="inning-history"><div className="inning-history-title"><b>이닝별 득점</b><span>최신 이닝이 아래쪽에 표시됩니다.</span></div><div className="inning-history-head"><div className="white-head"><small>흰공</small><b>{players[0]?.name||'선수 1'}</b></div><div className="inning-head">이닝</div><div className="yellow-head"><small>노란공</small><b>{players[1]?.name||'선수 2'}</b></div></div><div className="inning-history-scroll" ref={scrollRef}>{rows.map(r=><div className={`inning-history-row ${r.inning===currentInning?'current':''}`} key={r.inning}><strong className="white-point">{r.white}</strong><span>{r.inning}</span><strong className="yellow-point">{r.yellow}</strong></div>)}</div></div>
}

function MultiScoreboard({game,onScore,onUndo,onFinish,onExit}){return <section className="multi-score-screen"><button className="exit-game" onClick={onExit}><ArrowLeft/> 경기 나가기</button><div className="multi-title"><small>QUICK START</small><h1>{game.playerCount}명 다인 경기</h1></div><div className={`multi-cards count-${game.playerCount}`}>{game.players.map((p,i)=><article key={i}><small>선수 {i+1}</small><h2>{p.name}</h2><strong>{p.score}</strong><div><button className="minus" onClick={()=>onScore(i,-1)}><Minus/>1</button><button onClick={()=>onScore(i,1)}><Plus/>1</button><button className="plus2" onClick={()=>onScore(i,2)}><Plus/>2</button></div></article>)}</div><div className="multi-actions"><button onClick={onUndo}><Undo2/> 실행 취소</button><button className="finish-small" onClick={onFinish}>경기 종료</button></div></section>}
