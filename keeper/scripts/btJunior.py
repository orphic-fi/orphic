import json, datetime as dt
L=json.load(open('lending365.json')); v=json.load(open('hlp.json')); P=dict(v['portfolio'])
def chain(per):
    av=per['accountValueHistory']; pn=per['pnlHistory']; pts=[(a[0]/1000,float(a[1]),float(b[1])) for a,b in zip(av,pn)]
    idx=[(pts[0][0],1.0)]; r=1
    for i in range(1,len(pts)):
        if pts[i-1][1]>0: r*=1+(pts[i][2]-pts[i-1][2])/pts[i-1][1]
        idx.append((pts[i][0],r))
    return idx
A=chain(P['allTime']); M=chain(P['month'])
def interp(idx,t):
    if t<=idx[0][0]: return idx[0][1]
    for i in range(1,len(idx)):
        if idx[i][0]>=t: (t0,v0),(t1,v1)=idx[i-1],idx[i]; return v0+(v1-v0)*(t-t0)/(t1-t0)
    return idx[-1][1]
ts=[r['t'] for r in L]; m0=M[0][0]; base=interp(A,m0)/interp(M,m0)
hlp=[interp(A,t) if t<m0 else interp(M,t)*base for t in ts]
fx=[r['fx'] for r in L]; hl=[r['hl'] for r in L]; n=len(ts)
rot=[1.0]
for i in range(1,n):
    pick_hl= True if i<2 else (hl[i-1]/hl[i-2])>(fx[i-1]/fx[i-2])
    rot.append(rot[-1]*((hl[i]/hl[i-1]) if pick_hl else (fx[i]/fx[i-1])))
drops=[(dt.date.fromtimestamp(ts[i]),round((fx[i]/fx[i-1]-1)*100,4)) for i in range(1,n) if fx[i]<fx[i-1]]
print("Felix daily share-price drops in 12 months:",drops[:5])
R=lambda s,a,b: s[b]/s[a]-1; ann=lambda r,d:(1+r)**(365/d)-1
end=n-1
for lab,d in [("12 months",365),("6 months",182),("2 months",61)]:
    a=end-d
    pk=hlp[a]; dd=0
    for i in range(a,end+1): pk=max(pk,hlp[i]); dd=min(dd,hlp[i]/pk-1)
    ro=ann(R(rot,a,end),d); hp=ann(R(hlp,a,end),d)
    print(f"\n{lab} {dt.date.fromtimestamp(ts[a])}..{dt.date.fromtimestamp(ts[end])}: Felix {ann(R(fx,a,end),d)*100:.2f} HyperLend {ann(R(hl,a,end),d)*100:.2f} rotation {ro*100:.2f} HLP {hp*100:.2f} (HLP worst drop {dd*100:.2f}%)")
    for w in (0,0.25,0.5):
        own=(1-w)*ro+w*hp
        print(f"  HLP {int(w*100)}%: own {own*100:.2f}  +fee at 1x {(own+0.005)*100:.2f}  4x {(own+0.02)*100:.2f}  9x {(own+0.045)*100:.2f}")
