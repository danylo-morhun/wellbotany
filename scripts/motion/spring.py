import math, sys
# Motion (framer-motion) spring from visualDuration + bounce, mass 1
def spring(vd, bounce, eps=0.003, dt=1/600):
    root = 2*math.pi/(vd*1.2)
    k = root*root
    c = 2*max(0.05, min(1, 1-bounce))*math.sqrt(k)
    x, v, t = 0.0, 0.0, 0.0
    pts=[(0,0)]; still=0
    while True:
        a = k*(1-x) - c*v
        v += a*dt; x += v*dt; t += dt
        pts.append((t,x))
        if abs(1-x)<eps and abs(v)<0.02: still+=dt
        else: still=0
        if still>0.03: break
    T=t
    # sample at ~ 1/60 s... then drop near-collinear points
    n=max(24,int(T*90))
    samples=[]
    j=0
    for i in range(n+1):
        tt=T*i/n
        while j<len(pts)-1 and pts[j+1][0]<tt: j+=1
        samples.append((i/n, pts[j][1]))
    samples[-1]=(1,1)
    def rdp(a):
        if len(a)<3: return a
        p,r=a[0],a[-1]; best,bi=0,0
        for i in range(1,len(a)-1):
            q=a[i]; lin=p[1]+(r[1]-p[1])*(q[0]-p[0])/(r[0]-p[0]); d=abs(lin-q[1])
            if d>best: best,bi=d,i
        if best<0.002: return [p,r]
        return rdp(a[:bi+1])[:-1]+rdp(a[bi:])
    keep=rdp(samples)
    out=[]
    for i,(px,py) in enumerate(keep):
        y=f"{py:.3f}".rstrip('0').rstrip('.') or "0"
        if i==0 or i==len(keep)-1: out.append(y)
        else: out.append(f"{y} {px*100:.1f}%".replace('.0%','%'))
    return round(T*1000), "linear("+", ".join(out)+")", max(p[1] for p in pts)
for name,vd,b in [("spring",0.3,0),("spring-snappy",0.18,0.15),("spring-bouncy",0.35,0.3)]:
    T,s,peak=spring(vd,b)
    print(name, T, f"peak={peak:.3f}", len(s)); print(s)
