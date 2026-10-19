import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,Flag,Maximize2,Minus,MonitorPlay,Plus,Undo2,X} from 'lucide-react';

export default function Scoreboard({game,onScore,onUndo,onPassTurn,onTimeout,onFinish,onExit,avg}){
 const isRecord=game.category==='record'&&game.mode==='single';
 const totalSeconds=Math.max(1,Number(game.timerSeconds)||40);
 const [seconds,setSeconds]=useState(totalSeconds);
 const [started,setStarted]=useState(false);
 const [cameraFull,setCameraFull]=useState(false);
 const [finishConfirm,setFinishConfirm]=useState(false);
 const logRef=useRef(null);
 useEffect(()=>{if(started)setSeconds(totalSeconds)},[game.currentTurn,totalSeconds,started,game.timeoutVersion]);
 useEffect(()=>{if(!isRecord||!started)return;const id=setInterval(()=>setSeconds(v=>Math.max(0,v-1)),1000);return()=>clearInterval(id)},[isRecord,started,game.currentTurn,totalSeconds]);
 useEffect(()=>{const el=logRef.current;if(el)el.scrollTop=el.scrollHeight},[game.events.length,game.inning]);
 if(game.mode==='multi')return <MultiScoreboard game={game} onScore={onScore} onUndo={onUndo} onFinish={onFinish} onExit={onExit}/>;
 const timerClass=seconds<=10?'timer-red':seconds<=15?'timer-orange':seconds<=25?'timer-yellow':'timer-green';
 return <section className="scoreboard-screen no-app-header">
  <button className="exit-game" onClick={onExit}><ArrowLeft/> 경기 나가기</button>
  {isRecord&&<SegmentTimer seconds={seconds} total={totalSeconds} timerClass={timerClass}/>} 
  <div className="sb-grid">
   <PlayerCard player={game.players[0]} index={0} active={!isRecord||(started&&game.currentTurn===0)} yellow={game.players[0]?.ball==='노란색'} currentAvg={avg(game.players[0])} onScore={onScore} onInactiveTap={onPassTurn} timeoutCount={game.timeoutCount||0} onTimeout={onTimeout}/>
   <main className="sb-center">
    {isRecord&&<button className={`pass-turn-hero ${started?'danger-turn':'start-turn'}`} onClick={()=>started?onPassTurn():setStarted(true)}><Flag/><span><b>{started?'턴 넘기기':'경기 시작'}</b><small>{started?'다음 선수 차례로 이동':'흰공 선수부터 카운트 시작'}</small></span></button>}
    <button className="sb-camera" onClick={()=>setCameraFull(true)}><MonitorPlay/><b>카메라 / 15초 리플레이 예정 영역</b><span>클릭하면 전체 화면</span></button>
    {isRecord&&<div className="inning-card inning-wide"><small>CURRENT INNING</small><strong>{game.inning}</strong><span>{started?`${game.players[game.currentTurn]?.ball||''} 선수 진행`:'경기 시작 대기'}</span></div>}
    <InningHistory events={game.events} players={game.players} currentInning={game.inning} scrollRef={logRef}/>
   </main>
   <PlayerCard player={game.players[1]} index={1} active={!isRecord||(started&&game.currentTurn===1)} yellow={game.players[1]?.ball==='노란색'} currentAvg={avg(game.players[1])} onScore={onScore} onInactiveTap={onPassTurn} timeoutCount={game.timeoutCount||0} onTimeout={onTimeout}/>
  </div>
  <div className="sb-controls record"><button onClick={onUndo}><Undo2/> 실행 취소</button><button className="finish-small" onClick={()=>setFinishConfirm(true)}>경기 종료</button></div>
  {finishConfirm&&<div className="finish-confirm-overlay"><section className="finish-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="finish-confirm-title"><button type="button" className="finish-confirm-close" onClick={()=>setFinishConfirm(false)} aria-label="닫기"><X/></button><div className="finish-confirm-icon"><Flag/></div><h2 id="finish-confirm-title">경기를 종료할까요?</h2><p>현재 점수와 이닝을 기준으로 경기 결과 화면으로 이동합니다.<br/><strong>결과 화면에서 경기로 돌아와 계속 수정할 수 있습니다.</strong></p><div className="finish-confirm-actions"><button type="button" onClick={()=>setFinishConfirm(false)}>취소</button><button type="button" className="finish-confirm-primary" onClick={()=>{setFinishConfirm(false);onFinish()}}>경기 종료하기</button></div></section></div>}
  {cameraFull&&<div className="camera-overlay"><button onClick={()=>setCameraFull(false)}><X/></button><div onClick={()=>setCameraFull(false)}><Maximize2/><h2>카메라 전체 화면</h2><p>카메라 연결 단계에서 영상이 표시됩니다.</p></div></div>}
 </section>
}
function SegmentTimer({seconds,total,timerClass}){return <div className={`segment-timer ${timerClass}`}><div className="segment-seconds"><strong>{seconds}</strong><span>초</span></div><div className="segment-track" style={{gridTemplateColumns:`repeat(${total},minmax(2px,1fr))`}}>{Array.from({length:total},(_,i)=><i key={i} className={i<seconds?'on':'off'}/>)}</div></div>}
function PlayerCard({player,index,active,yellow,currentAvg,onScore,onInactiveTap,timeoutCount,onTimeout}){
 if(!player)return <aside/>;
 const base=Number(player.calculatedAvg),now=Number(currentAvg),delta=Number.isFinite(base)?now-base:null;
 return <aside className={`sb-player score-layout-v145 ${yellow?'yellow':''} ${active?'active':'inactive'}`}><div className="player-identity centered-identity"><div className={`ball ${player.ball}`}></div><h2>{player.name}</h2><em>핸디 {player.handicap}점</em></div><div className="score-adjust wide-adjust no-label"><button disabled={!active} onClick={()=>onScore(index,-1)}><Minus/></button><button disabled={!active} onClick={()=>onScore(index,1)}><Plus/></button></div><div className="timeout-stack" aria-label="타임아웃">{Array.from({length:timeoutCount},(_,i)=>{const used=i<(player.timeoutsUsed||0);return <button type="button" key={i} className={used?'used':''} disabled={used||!active} onClick={()=>onTimeout(index)} title={used?'사용한 타임아웃':'타임아웃 사용'}><span>TO</span><b>{i+1}</b></button>})}</div><div className="main-score-area score-tap" onClick={()=>active?onScore(index,1):onInactiveTap()}><strong className="sb-score classic-score">{player.score}</strong><div className="turn-score-box"><small>현재 득점</small><b>{player.inningPoints}</b></div></div><div className="sb-metrics large-metrics"><span>AVG <b>{currentAvg}</b>{delta!==null&&Math.abs(delta)>=.001&&<small className={`avg-delta ${delta>0?'plus':'minus'}`}>{delta>0?'+':''}{delta.toFixed(3)}</small>}</span><span>HR <b>{player.hr}</b></span></div><div className="sb-score-buttons two-buttons raised-buttons"><button disabled={!active} className="plus1" onClick={()=>onScore(index,1)}><span className="point-label"><Plus/><b>1점</b></span></button><button disabled={!active} className="plus2" onClick={()=>onScore(index,2)}><span className="point-label"><Plus/><b>2점</b></span></button></div></aside>
}
function InningHistory({events,players,currentInning,scrollRef}){
 const whiteIndex=players.findIndex(p=>p.ball==='흰색'),yellowIndex=players.findIndex(p=>p.ball==='노란색');
 const rows=useMemo(()=>{const map=new Map();events.forEach(e=>{if(e.playerIndex<0)return;const inning=Number(e.inning);if(!map.has(inning))map.set(inning,{inning,white:0,yellow:0});const row=map.get(inning);if(e.playerIndex===whiteIndex)row.white+=Number(e.points)||0;if(e.playerIndex===yellowIndex)row.yellow+=Number(e.points)||0});if(!map.has(currentInning))map.set(currentInning,{inning:currentInning,white:0,yellow:0});return [...map.values()].sort((a,b)=>a.inning-b.inning)},[events,currentInning,whiteIndex,yellowIndex]);
 return <div className="inning-history"><div className="inning-history-title"><b>이닝별 득점</b></div><div className="inning-history-scroll" ref={scrollRef}><div className="inning-history-head"><div><small>흰공</small><b>{players[whiteIndex]?.name||'선수'}</b></div><div className="inning-head">이닝</div><div><small>노란공</small><b>{players[yellowIndex]?.name||'선수'}</b></div></div>{rows.map(r=><div className={`inning-history-row ${r.inning===currentInning?'current':''}`} key={r.inning}><strong>{r.white}</strong><span>{r.inning}</span><strong>{r.yellow}</strong></div>)}</div></div>
}
function MultiScoreboard({game,onScore,onUndo,onFinish,onExit}){const [finishConfirm,setFinishConfirm]=useState(false);return <section className="multi-score-screen"><button className="exit-game" onClick={onExit}><ArrowLeft/> 경기 나가기</button><div className="multi-title"><small>QUICK START</small><h1>{game.playerCount}명 다인 경기</h1></div><div className={`multi-cards count-${game.playerCount}`}>{game.players.map((p,i)=><article key={i}><small>선수 {i+1}</small><h2>{p.name}</h2><strong>{p.score}</strong><div className="multi-point-buttons"><button onClick={()=>onScore(i,1)}><Plus/>1점</button><button onClick={()=>onScore(i,2)}><Plus/>2점</button></div></article>)}</div><div className="multi-actions"><button onClick={onUndo}><Undo2/> 실행 취소</button><button className="finish-small" onClick={()=>setFinishConfirm(true)}>경기 종료</button></div>{finishConfirm&&<div className="finish-confirm-overlay"><section className="finish-confirm-modal" role="dialog" aria-modal="true"><button type="button" className="finish-confirm-close" onClick={()=>setFinishConfirm(false)}><X/></button><div className="finish-confirm-icon"><Flag/></div><h2>경기를 종료할까요?</h2><p>현재 점수를 기준으로 경기 결과 화면으로 이동합니다.<br/><strong>결과를 확인한 후 다음 작업을 선택할 수 있습니다.</strong></p><div className="finish-confirm-actions"><button type="button" onClick={()=>setFinishConfirm(false)}>취소</button><button type="button" className="finish-confirm-primary" onClick={()=>{setFinishConfirm(false);onFinish()}}>경기 종료하기</button></div></section></div>}</section>}
