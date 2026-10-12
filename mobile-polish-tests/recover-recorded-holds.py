"""Recover dropped final stationary holds from actual hosted CDP recording.
No capture, synthetic animation, retiming of interactions, or new browser.
The two archived native timestamp manifests each prove a 14-second capture.
FFmpeg -t removed the final concat packet BEFORE CFR hold duplication.
Restore only the end-of-segment holds, never alter dynamic footage timing.
"""
import argparse,json,pathlib,subprocess
p=argparse.ArgumentParser();p.add_argument('artifact',type=pathlib.Path);p.add_argument('--cut',type=float,required=True);a=p.parse_args();root=a.artifact.resolve();source=root/'freight-atlas-tour.mp4';output=root/'freight-atlas-tour-28s.mp4'
probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(source)]));duration=float(probe['format']['duration']);s=probe['streams'][0]
assert (s['width'],s['height'],s['codec_name'],s['pix_fmt'])==(880,1100,'h264','yuv420p') and len(probe['streams'])==1
segments=[]
for name,length in [('national',a.cut),('chicago',duration-a.cut)]:
    manifest=json.loads((root/(name+'-frames.json')).read_text());frames=manifest['frames'];delta=frames[-1]['timestamp']-frames[0]['timestamp'];assert 14<=manifest['elapsed']<15 and delta<length<delta+.2
    assert all(x['timestamp']<y['timestamp'] for x,y in zip(frames,frames[1:]));segments.append({'name':name,'recordedWallSeconds':manifest['elapsed'],'sourceFirstTimestamp':frames[0]['timestamp'],'sourceLastTimestamp':frames[-1]['timestamp'],'nativeFrames':len(frames),'encodedDynamicSeconds':length,'restoredStationarySeconds':14-length})
filters=f'[0:v]split=2[a][b];[a]trim=start=0:end={a.cut},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={14-a.cut},trim=duration=14[x];[b]trim=start={a.cut},setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={14-(duration-a.cut)},trim=duration=14[y];[x][y]concat=n=2:v=1:a=0[v]'
subprocess.run(['ffmpeg','-y','-loglevel','error','-threads','1','-filter_complex_threads','1','-i',str(source),'-filter_complex',filters,'-map','[v]','-c:v','libx264','-threads','1','-preset','medium','-crf','21','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(output)],check=True)
final=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(output)]));assert float(final['format']['duration'])==28 and len(final['streams'])==1
subprocess.run(['ffmpeg','-v','error','-threads','1','-i',str(output),'-f','null','-'],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-threads','1','-i',str(output),'-vf','fps=1,scale=220:275,tile=7x4','-frames:v','1','-threads','1',str(root/'final-contact-sheet.jpg')],check=True)
for sec in [0,6,8,13,14,16,18,21,23,25,27]:subprocess.run(['ffmpeg','-y','-loglevel','error','-threads','1','-ss',str(sec),'-i',str(output),'-frames:v','1','-threads','1',str(root/('final-probe-%02d.jpg'%sec))],check=True)
report={'captureRevision':'630c8cbdef9c79a104c750153291d14860510775','source':str(source),'sourceProbe':probe,'finalProbe':final,'segments':segments,'cutVerifiedByFFmpegSceneDetectionSeconds':a.cut,'method':'Restore ONLY the stationary trailing holds lost at export, using native CDP capture wall durations. No dynamic footage is sped up, slowed, interpolated or replaced with screenshots. Holds clone the actual final screencast frame, not the PNG stills.','limitations':'Hosted capture QA passed; CI overall failed original duration assertion. Bounded offline recovery uses existing ffmpeg, no new CI or browser. Original driver actions were not persisted before that assertion; source frame timestamp manifests and visually reviewed action observations retained instead.'}
(root/'recovery-report.json').write_text(json.dumps(report,indent=2));print(json.dumps({'output':str(output),'duration':final['format']['duration'],'bytes':output.stat().st_size,'segments':segments}))
