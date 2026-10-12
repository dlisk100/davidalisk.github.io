"""Native wheel calibration: camera reads, never camera mutation."""
import math

def gain(before,after,delta):
    coefficient=-math.log(after/before)/delta
    if not .0001<coefficient<.01:raise ValueError('Unexpected native wheel response')
    return coefficient

def wheel_delta(current,target,coefficient):
    return -math.log(target/current)/coefficient
