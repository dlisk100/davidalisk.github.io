'use strict';
window.PipelineGhost=(()=>{const cache=new Map();return {load(key){const file=window.PZ&&PZ.pipelineGhostIndex&&PZ.pipelineGhostIndex[key];if(!file)return Promise.resolve([]);if(!cache.has(key))cache.set(key,RoadGzip.read(file).catch(e=>{cache.delete(key);throw e;}));return cache.get(key);}};})();
