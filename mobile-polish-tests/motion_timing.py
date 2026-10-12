"""Real source-frame intervals bounded by requested and observed capture time."""
def frame_intervals(frames, seconds, elapsed):
    assert frames and seconds > 0 and elapsed > 0
    duration=min(seconds, elapsed)
    start=frames[0]['timestamp']; cutoff=start+duration
    assert all(b['timestamp']>a['timestamp'] for a,b in zip(frames,frames[1:]))
    kept=[f for f in frames if f['timestamp']<cutoff]
    intervals=[]
    for i,f in enumerate(kept):
        end=min(kept[i+1]['timestamp'],cutoff) if i+1<len(kept) else cutoff
        delta=end-f['timestamp']; assert delta>0
        intervals.append((f,delta))
    assert abs(sum(d for _,d in intervals)-duration)<1e-6
    return intervals, duration
