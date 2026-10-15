// Split source polygons at the acquisition extent; clip edges are not borders.
// Political outlines (states and countries) never draw the data-extent clip edge.
export function outlineGeometry(layer,g,b){return layer==='land'?g:{type:'MultiLineString',coordinates:boundaryLines(g,b)}}
export function boundaryLines(g,b){const rs=g.type==='MultiPolygon'?g.coordinates.flat():g.coordinates;const result=[];for(const r of rs){let line=[];for(let i=1;i<r.length;i++){const a=r[i-1],z=r[i];const near=(v,e)=>Math.abs(v-e)<.03,clip=[0,1,2,3].some(j=>near(a[j%2],b[j])&&near(z[j%2],b[j]));if(clip){if(line.length>1)result.push(line);line=[]}else{if(!line.length)line.push(a);line.push(z)}}if(line.length>1)result.push(line)}return result}
