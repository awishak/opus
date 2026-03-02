import { useState, useEffect, useCallback, useMemo } from "react";

const STORAGE_KEY = "songbattle_db_v3";
const FONT = "'DM Sans', 'Helvetica Neue', system-ui, sans-serif";

function gid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function getDecade(y) { if (!y) return null; const n = parseInt(y); return isNaN(n) ? null : Math.floor(n / 10) * 10 + "s"; }
function wp(w, l) { const t = w + l; return t === 0 ? "\u2014" : ((w / t) * 100).toFixed(1); }
function wpn(w, l) { const t = w + l; return t === 0 ? 0 : w / t; }
function emptyDB() { return { songs: [], matchups: [], imported: false }; }

// Elo rating calculation
function calcElo(songs, matchups) {
  const K = 32;
  const elo = {};
  songs.forEach(s => { elo[s.id] = 1500; });
  // Sort matchups by timestamp for chronological Elo
  const sorted = [...matchups].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  // First apply imported records as a batch approximation
  songs.forEach(s => {
    const w = s.iw || 0, l = s.il || 0;
    if (w + l > 0) { elo[s.id] = 1500 + (w - l) * 8; }
  });
  // Then apply live matchups
  sorted.forEach(m => {
    const rW = elo[m.wi] || 1500, rL = elo[m.li] || 1500;
    const eW = 1 / (1 + Math.pow(10, (rL - rW) / 400));
    const eL = 1 - eW;
    elo[m.wi] = rW + K * (1 - eW);
    elo[m.li] = rL + K * (0 - eL);
  });
  return elo;
}

async function loadDB() { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : emptyDB(); } catch { return emptyDB(); } }
async function saveDB(db) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { console.error(e); } }

const SEED = [
["Shot in the Dark","John Mayer","2021",48,1],["If I Ever Get Around To Living","John Mayer","2012",46,0],["In My Place","Coldplay","2002",46,4],["Queen of California","John Mayer","2012",45,4],["#41","Dave Matthews Band","1996",44,3],["Wanna Be Startin' Somethin'","Michael Jackson","1982",43,6],["So Much to Say","Dave Matthews Band","1996",41,5],["Linger","The Cranberries","1994",41,7],["Come Around","Bernhoft","2014",41,13],["Wild Blue","John Mayer","2021",40,3],["Gravity (Live at the Nokia Theatre)","John Mayer","2007",38,8],["Deep In Love","Bonny Light Horseman","2020",38,14],["Clarity","John Mayer","2003",35,11],["Only Wanna Be With You","Hootie & The Blowfish","1995",35,11],["In Repair","John Mayer","2006",35,19],["My Favorite Mistake","Sheryl Crow","1999",34,1],["Louie Bag (Live at Electric Lady)","Yebba","2022",34,12],["Hey Ya!","Outkast","2002",34,17],["Jaded","Aerosmith","2001",33,12],["Love Is An Ocean","KT Tunstall","2017",32,12],["Lancaster Nights","Charlie Burg","2021",30,15],["Wild","Spoon","2022",30,17],["Overnight","Maggie Rogers","2018",29,14],["Belief","John Mayer","2006",29,17],["So Fresh, So Clean","Outkast","2001",28,13],["Infinitely Tall","Charlie Burg","2022",26,12],["Yellow","Coldplay","1999",26,12],["Chloroform","Phoenix","2013",25,13],["Retrograde","Maggie Rogers","2018",23,10],["Fallingwater","Maggie Rogers","2018",23,12],["Good Energy","Mike Sabath","2020",22,10],["Fulton County Jane Doe","Brandi Carlile","2018",22,11],["God - Senna Theme Reprise Redux","Antonio Pinto","2011",22,14],["Slow Dancing in a Burning Room","John Mayer","2006",22,14],["Moving On And Getting Over","John Mayer","2017",21,13],["We Walk the Same Line","Everything But The Girl","1994",21,13],["Vultures","John Mayer","2006",20,11],["They Want My Soul","Spoon","2014",20,12],["Orphans","Coldplay","2020",19,14],["Rent I Pay","Spoon","2014",19,15],["Southern Sun","Boy & Bear","2013",19,15],["Learning to Fly","Tom Petty and the Heartbreakers","1991",18,8],["Neon","John Mayer","2002",18,12],["The Middle","Jimmy Eat World","2002",18,12],["Everybody Wants To Rule The World","Tears For Fears","1985",18,13],["Feels Alright","Spoon","2022",18,13],["Sunday Morning","Maroon 5","2002",18,14],["Blue Sky","Allman Brothers","1972",17,14],["TV","Sebastian Yatra","2022",17,14],["Dreams","Fleetwood Mac","1977",17,15],["One Time Too Many","Phoenix","2006",17,15],["Trying To Be Cool","Phoenix","2013",17,16],["Almost (Sweet Music)","Hozier","2019",16,8],["Gypsy","Fleetwood Mac","1982",16,9],["Heavy, California","Jungle","2018",15,11],["After Midnight","Phoenix","2022",15,13],["Don't Look Back in Anger","Oasis","1995",15,18],["The Game of Love","Santana ft. Michelle Branch","2002",15,18],["Yanada","The Preatures","2014",15,18],["Fantasy","Mariah Carey","1995",15,19],["I Wanna Dance With Somebody","Whitney Houston","1987",14,10],["September","Earth, Wind and Fire","1978",14,16],["Texas Flood","Stevie Ray Vaughan","1983",14,17],["Almighty Gosh","Lucius","2022",14,18],["Lo/Hi","The Black Keys","2019",14,19],["The Way It Is","Bruce Hornsby & The Range","1986",14,19],["Astral Weeks","Van Morrison","1968",13,7],["The Remedy (I Won't Worry)","Jason Mraz","2002",13,16],["Hoops","Julia Wolf","2021",13,18],["Fever","Roosevelt","2016",13,20],["Life in Technicolor","Coldplay","2008",13,22],["Time","Hootie & The Blowfish","1995",13,22],["Slow Burn","Kacey Musgraves","2018",12,8],["Summertime","The Sundays","1997",12,16],["Gemini and Leo","Helado Negro","2019",12,17],["Sit Next to Me","Foster The People","2017",12,17],["Spiderwebs","No Doubt","1995",12,17],["Nick of Time","Bonnie Raitt","1989",12,18],["Evergreen","Yebba","2021",12,20],["Ironic","Alanis Morissette","1995",12,20],["Falling In Place","Dog's Eye View","1996",11,18],["Formation","Beyonce","2016",10,13],["Love Song","Sara Bareilles","2007",10,23],["Orange Blood","Mt. Joy","2022",10,24],["Uncharted","Sara Bareilles","2011",10,24],["A Promise To Keep","Brandi Carlile","2012",10,26],["You Get What You Give","The New Radicals","1998",9,8],["Free Fallin'","Tom Petty","1989",9,15],["Friday I'm In Love","The Cure","1992",9,19],["Bend & Break","Keane","2004",9,20],["Some Say","Rascal Flatts","2006",9,22],["Simple Song","The Shins","2012",9,24],["Dog Years","Maggie Rogers","2019",8,4],["You Oughta Know","Alanis Morissette","1995",8,8],["Drive","The Cars","1984",8,15],["Don't Dream It's Over","Crowded House","1986",8,20],["Don't You Evah","Spoon","2007",8,22],["You Can Call Me Al","Paul Simon","1986",8,22],["Hard Way Home","Brandi Carlile","2012",8,23],["Apartment","Young the Giant","2010",8,24],["Another Life","Third Eye Blind","2003",8,25],["Midnight City","M83","2011",8,27],["Keep Your Heart Young","Brandi Carlile","2012",7,19],["Harder To Breathe","Maroon 5","2002",7,22],["Goodbye Soleil","Phoenix","2017",7,23],["Beautiful Day","U2","2000",6,22],["Take A Picture","Filter","1999",6,24],["Cool","Dua Lipa","2019",6,25],["Just Like Heaven","The Cure","1987",5,18],["Fine Line","Little Big Town","2017",5,22],["I Don't Want to Miss a Thing","Aerosmith","1998",5,23],["Oh, What A World","Kacey Musgraves","2018",5,23],["This Is America","Childish Gambino","2018",5,25],["You Make My Dreams (Come True)","Hall & Oates","1981",4,10],["Interstate Love Song","Stone Temple Pilots","1994",4,13],["Nao Me Toca","Anselmo Ralph","2012",4,13],["Respect","Aretha Franklin","1967",4,17],["Blame It on Me","George Ezra","2014",4,24],["Times Like These","Foo Fighters","2002",4,24],["Flynn Lives","Daft Punk","2010",4,25],["Many the Miles","Sara Bareilles","2007",3,27],["U.F.O.","Coldplay","2008",3,27],["Drakkar Noir","Phoenix","2013",3,29],["Dare You To Move","Switchfoot","2003",2,6],["Everywhere","Fleetwood Mac","1987",2,12],["Single, No Return","Ten Fe","2017",1,3],["The Power of Love","Huey Lewis & The News","1985",1,9],["Earth Song","Michael Jackson","1995",0,0],["Suck on Light","Boy & Bear","2019",0,0],["Baby I Love Your Way","Big Mountain","1994",0,0],["Booster Seat","Spacey Jane","2020",0,0],["Brooklyn Baby","Flipturn","2021",0,0],["Glistening","Flipturn","2021",0,0],["Juno","Flipturn","2021",0,0],["Rodeo Clown","Flipturn","2021",0,0],["Whales","Flipturn","2019",0,0],["Brazil","Declan McKenna","2017",0,0],["Mariella","Khruangbin","2019",0,0],["First Blush","Ocean Alley","2018",0,0],["Simple Man","Brandon Heath","2008",0,0],["Like A Child","Jars Of Clay","1995",0,0],["Best of My Love","The Emotions","1977",0,0],["Pinch Me","Barenaked Ladies","2000",0,0],["Who Needs Shelter","Jason Mraz","2002",0,0],["Saltwater","Geowulf","2017",0,0],["Scream","Michael Jackson & Janet Jackson","1995",0,0],["Pig","Dave Matthews Band","1998",0,0],["Someday","Sugar Ray","1999",0,0],["Bluebird","Sara Bareilles","2007",0,0],["Plush","Stone Temple Pilots","1992",0,0],["Live in the Moment","Portugal. The Man","2017",0,0],["Stand by Me","Ben E. King","1961",0,0]
];

function buildSeed() {
  return SEED.map(([title, artist, yr, w, l]) => ({
    id: gid(), title, artist,
    year: yr && !isNaN(parseInt(yr)) ? parseInt(yr) : null,
    iw: w, il: l,
  }));
}

export default function App() {
  const [db, setDb] = useState(emptyDB());
  const [pg, setPg] = useState("compare");
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState(null);
  const [addIn, setAddIn] = useState("");
  const [addMsg, setAddMsg] = useState("");
  const [stFilt, setStFilt] = useState("all");
  const [leastMode, setLeastMode] = useState(false);
  const [selArtist, setSelArtist] = useState(null);
  const [selDecade, setSelDecade] = useState(null);
  const [anim, setAnim] = useState(null);
  const [search, setSearch] = useState("");
  const [editSong, setEditSong] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "", year: "" });
  const [delConfirm, setDelConfirm] = useState(null);

  useEffect(() => {
    loadDB().then((d) => {
      if (!d.imported) {
        const nd = { songs: buildSeed(), matchups: [], imported: true };
        saveDB(nd); setDb(nd);
      } else { setDb(d); }
      setLoading(false);
    });
  }, []);

  const save = useCallback(async (nd) => { setDb(nd); await saveDB(nd); }, []);

  const stats = useMemo(() => {
    const s = {};
    db.songs.forEach((x) => { s[x.id] = { w: x.iw || 0, l: x.il || 0, m: (x.iw || 0) + (x.il || 0) }; });
    db.matchups.forEach((x) => {
      if (s[x.wi]) { s[x.wi].w++; s[x.wi].m++; }
      if (s[x.li]) { s[x.li].l++; s[x.li].m++; }
    });
    return s;
  }, [db]);

  const elo = useMemo(() => calcElo(db.songs, db.matchups), [db]);

  const pick = useCallback(() => {
    if (db.songs.length < 2) { setPair(null); return; }
    let pool = [...db.songs].filter(s => !s.archived);
    if (leastMode) {
      pool.sort((a, b) => (stats[a.id]?.m || 0) - (stats[b.id]?.m || 0));
      pool = pool.slice(0, Math.min(30, pool.length));
    }
    const sh = [...pool].sort(() => Math.random() - 0.5);
    let a = sh[0], b = sh.length > 1 ? sh[1] : db.songs.find((x) => x.id !== a.id);
    if (a && b && a.id !== b.id) setPair([a, b]);
  }, [db.songs, leastMode, stats]);

  useEffect(() => { if (!loading && db.songs.length >= 2 && !pair) pick(); }, [loading, db.songs.length, pick, pair]);

  const choose = async (wi, li) => {
    setAnim(wi);
    setTimeout(async () => {
      const nd = { ...db, matchups: [...db.matchups, { id: gid(), wi, li, ts: Date.now() }] };
      await save(nd); setAnim(null);
      setTimeout(() => setPair(null), 50);
    }, 280);
  };

  const addSongs = async () => {
    const lines = addIn.split("\n").map((l) => l.trim()).filter(Boolean);
    let added = 0; const ns = [...db.songs];
    for (const line of lines) {
      let m = line.match(/^(.+?)\s*[-\u2013\u2014]\s*(.+?)(?:\s*[\(,]\s*(\d{4})\s*\)?)?\s*(?:\[(\d+)\s*-\s*(\d+)\])?\s*$/);
      if (m) {
        const t = m[1].trim(), ar = m[2].trim(), y = m[3] ? parseInt(m[3]) : null;
        const iw = m[4] ? parseInt(m[4]) : 0, il = m[5] ? parseInt(m[5]) : 0;
        if (!ns.some((s) => s.title.toLowerCase() === t.toLowerCase() && s.artist.toLowerCase() === ar.toLowerCase())) {
          ns.push({ id: gid(), title: t, artist: ar, year: y, iw, il }); added++;
        }
      }
    }
    await save({ ...db, songs: ns });
    setAddMsg(`Added ${added} song${added !== 1 ? "s" : ""}.${lines.length - added > 0 ? ` ${lines.length - added} skipped.` : ""}`);
    setAddIn(""); setTimeout(() => setAddMsg(""), 4000);
  };

  const enriched = useMemo(() => db.songs.map((s) => {
    const st = stats[s.id] || { w: 0, l: 0, m: 0 };
    return { ...s, w: st.w, l: st.l, m: st.m, pct: wpn(st.w, st.l), elo: Math.round(elo[s.id] || 1500) };
  }), [db.songs, stats, elo]);

  const ranked = useMemo(() => enriched.filter((s) => s.m >= 10 && !s.archived).sort((a, b) => b.pct !== a.pct ? b.pct - a.pct : b.m - a.m), [enriched]);

  const artists = useMemo(() => {
    const map = {};
    enriched.filter(s => !s.archived).forEach((s) => { const k = s.artist.toLowerCase(); if (!map[k]) map[k] = { name: s.artist, songs: [] }; map[k].songs.push(s); });
    return Object.values(map).sort((a, b) => b.songs.length - a.songs.length);
  }, [enriched]);

  const decs = useMemo(() => {
    const map = {};
    enriched.filter(s => !s.archived).forEach((s) => { const d = getDecade(s.year); if (!d) return; if (!map[d]) map[d] = []; map[d].push(s); });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).map(([d, songs]) => ({ d, songs: songs.sort((a, b) => b.pct - a.pct) }));
  }, [enriched]);

  // Styles
  const pill = (a) => ({ padding: "7px 16px", fontSize: 13, fontWeight: a ? 600 : 400, background: a ? "#1a1a1a" : "transparent", color: a ? "#fff" : "#888", border: "none", borderRadius: 100, cursor: "pointer", transition: "all 0.15s", fontFamily: FONT });
  const tog = (a) => ({ padding: "5px 13px", fontSize: 12, fontWeight: a ? 600 : 400, background: a ? "#f0f0f0" : "transparent", color: a ? "#1a1a1a" : "#aaa", border: a ? "1px solid #ddd" : "1px solid transparent", borderRadius: 100, cursor: "pointer", transition: "all 0.15s", fontFamily: FONT });
  const bp = { padding: "10px 24px", fontSize: 14, fontWeight: 600, background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 100, cursor: "pointer", fontFamily: FONT };
  const bg = { ...bp, background: "transparent", color: "#888", border: "1px solid #ddd", fontWeight: 400 };
  const TH = { textAlign: "left", padding: "10px 8px", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#aaa", borderBottom: "2px solid #f0f0f0" };
  const TD = { padding: "10px 8px", borderBottom: "1px solid #f5f5f5", fontSize: 13 };

  const SBtn = ({ song, onClick }) => (
    <button style={{ flex: 1, padding: "36px 18px", background: anim === song.id ? "#1a1a1a" : "#fff", color: anim === song.id ? "#fff" : "#1a1a1a", border: "2px solid #ebebeb", borderRadius: 16, cursor: "pointer", transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)", textAlign: "center", minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 5, fontFamily: FONT }}
      onClick={onClick}
      onMouseEnter={(e) => { if (!anim) { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.05)"; } }}
      onMouseLeave={(e) => { if (!anim) { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; } }}>
      <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.25 }}>{song.title}</span>
      <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.55 }}>{song.artist}</span>
      {song.year && <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.35 }}>{song.year}</span>}
    </button>
  );

  const Compare = () => {
    if (db.songs.filter(s => !s.archived).length < 2) return (<div style={{ textAlign: "center", padding: "56px 24px", color: "#bbb" }}><p style={{ fontSize: 17, fontWeight: 600, color: "#aaa", margin: "0 0 6px" }}>Add at least 2 songs to start</p><button style={bp} onClick={() => setPg("add")}>Add Songs</button></div>);
    if (!pair) return <div style={{ textAlign: "center", padding: 40, color: "#ccc" }}>Loading...</div>;
    const s0 = stats[pair[0].id] || { w: 0, l: 0, m: 0 };
    const s1 = stats[pair[1].id] || { w: 0, l: 0, m: 0 };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <button style={tog(!leastMode)} onClick={() => { setLeastMode(false); setPair(null); }}>Random</button>
            <button style={tog(leastMode)} onClick={() => { setLeastMode(true); setPair(null); }}>Least Matched</button>
          </div>
          <span style={{ fontSize: 11, color: "#ccc", fontWeight: 500 }}>#{db.matchups.length + 1}</span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
          <SBtn song={pair[0]} onClick={() => choose(pair[0].id, pair[1].id)} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#d4d4d4", letterSpacing: 2, flexShrink: 0, alignSelf: "center" }}>VS</span>
          <SBtn song={pair[1]} onClick={() => choose(pair[1].id, pair[0].id)} />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
          {[s0, s1].map((st, i) => (<div key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: "#bbb" }}>{st.m > 0 ? `${st.m} matchups` : "No matchups"}</div>))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 36, marginTop: 24 }}>
          {[{ n: db.songs.filter(s => !s.archived).length, l: "Songs" }, { n: db.matchups.length, l: "New Matchups" }, { n: ranked.length, l: "Ranked" }].map((x) => (
            <div key={x.l} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#1a1a1a" }}>{x.n}</div>
              <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 2 }}>{x.l}</div>
            </div>
          ))}
        </div>
        <button style={{ ...bg, display: "block", margin: "10px auto 0", fontSize: 12, padding: "7px 20px" }} onClick={() => setPair(null)}>Skip</button>
      </div>
    );
  };

  // Album art cache
  const [artCache, setArtCache] = useState({});
  const fetchArt = useCallback(async (title, artist, id) => {
    if (artCache[id]) return;
    try {
      const q = encodeURIComponent(`${title} ${artist}`);
      const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const url = data.results[0].artworkUrl100.replace("100x100", "60x60");
        setArtCache(prev => ({ ...prev, [id]: url }));
      } else {
        setArtCache(prev => ({ ...prev, [id]: null }));
      }
    } catch { setArtCache(prev => ({ ...prev, [id]: null })); }
  }, [artCache]);

  const ArtImg = ({ song }) => {
    useEffect(() => { if (artCache[song.id] === undefined) fetchArt(song.title, song.artist, song.id); }, [song.id, song.title, song.artist]);
    const url = artCache[song.id];
    if (url === undefined) return <div style={{ width: 40, height: 40, borderRadius: 6, background: "#f0f0f0", flexShrink: 0 }} />;
    if (url === null) return <div style={{ width: 40, height: 40, borderRadius: 6, background: "#f5f5f5", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 16, color: "#ddd" }}>♪</span></div>;
    return <img src={url} alt="" style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0, objectFit: "cover" }} />;
  };

  const Standings = () => {
    const activeEnriched = enriched.filter(s => !s.archived);
    const unranked = activeEnriched.filter((s) => s.m < 10).sort((a, b) => a.m - b.m);
    const list = stFilt === "all" ? ranked : stFilt === "unranked" ? unranked : [...activeEnriched].sort((a, b) => b.pct !== a.pct ? b.pct - a.pct : b.m - a.m);
    const filtered = search ? list.filter((s) => (s.title + " " + s.artist).toLowerCase().includes(search.toLowerCase())) : list;
    return (
      <div>
        <div style={{ display: "flex", gap: 5, marginBottom: 14, flexWrap: "wrap" }}>
          <button style={tog(stFilt === "all")} onClick={() => setStFilt("all")}>Ranked ({ranked.length})</button>
          <button style={tog(stFilt === "unranked")} onClick={() => setStFilt("unranked")}>Needs More ({unranked.length})</button>
          <button style={tog(stFilt === "everyone")} onClick={() => setStFilt("everyone")}>All ({activeEnriched.length})</button>
        </div>
        <input type="text" placeholder="Search songs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "9px 14px", fontSize: 13, border: "1px solid #e8e8e8", borderRadius: 10, fontFamily: FONT, boxSizing: "border-box", outline: "none", marginBottom: 14, background: "#fff" }} />
        {filtered.length === 0 ? (<div style={{ textAlign: "center", padding: "40px 24px", color: "#bbb" }}><p style={{ fontSize: 14, fontWeight: 500 }}>{search ? "No matches" : "Songs need 10+ matchups"}</p></div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={{ ...TH, width: 34 }}>#</th><th style={TH}></th><th style={TH}>Song</th><th style={{ ...TH, textAlign: "right" }}>W</th><th style={{ ...TH, textAlign: "right" }}>L</th><th style={{ ...TH, textAlign: "right" }}>Pct</th><th style={{ ...TH, textAlign: "right" }}>Elo</th><th style={{ ...TH, textAlign: "right" }}>GP</th></tr></thead>
              <tbody>{filtered.map((s, i) => {
                const r = stFilt === "all" ? ranked.indexOf(s) + 1 : i + 1;
                const top = r <= 3 && stFilt === "all";
                return (<tr key={s.id} style={top ? { background: "#fafaf9" } : {}}>
                  <td style={{ ...TD, fontWeight: 700, color: top ? "#1a1a1a" : "#ccc", fontSize: top ? 15 : 12 }}>{r}</td>
                  <td style={{ ...TD, padding: "6px 4px", width: 44 }}><ArtImg song={s} /></td>
                  <td style={TD}><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 11, color: "#aaa" }}>{s.artist}{s.year ? ` \u00B7 ${s.year}` : ""}</div></td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: "#22863a" }}>{s.w}</td>
                  <td style={{ ...TD, textAlign: "right", color: "#cb2431" }}>{s.l}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 700 }}>{s.m >= 10 ? wp(s.w, s.l) + "%" : <span style={{ color: "#ccc" }}>{wp(s.w, s.l)}%</span>}</td>
                  <td style={{ ...TD, textAlign: "right", color: "#7c6bbf", fontWeight: 600, fontSize: 12 }}>{s.elo}</td>
                  <td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.m}</td>
                </tr>);
              })}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const Add = () => (
    <div>
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #ebebeb" }}>
        <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 600 }}>Add Songs</h3>
        <p style={{ margin: "0 0 14px", fontSize: 12, color: "#aaa" }}>One per line: <strong>Song - Artist (Year)</strong> or <strong>Song - Artist (Year) [W-L]</strong></p>
        <textarea style={{ width: "100%", padding: "12px 14px", fontSize: 13, border: "1px solid #e0e0e0", borderRadius: 10, fontFamily: FONT, resize: "vertical", minHeight: 140, boxSizing: "border-box", outline: "none", background: "#fafaf9", lineHeight: 1.6 }} value={addIn} onChange={(e) => setAddIn(e.target.value)} placeholder={"Bohemian Rhapsody - Queen (1975)\nBlinding Lights - The Weeknd (2020) [15-3]"} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
          <button style={{ ...bp, opacity: addIn.trim() ? 1 : 0.4 }} onClick={addSongs} disabled={!addIn.trim()}>Add Songs</button>
          {addMsg && <span style={{ fontSize: 12, color: "#22863a", fontWeight: 500 }}>{addMsg}</span>}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#ccc", marginTop: 10 }}>{db.songs.length} songs in database</div>
      {db.songs.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={TH}>Song</th><th style={TH}>Artist</th><th style={{ ...TH, textAlign: "right" }}>Year</th><th style={{ ...TH, textAlign: "right" }}>Record</th></tr></thead>
            <tbody>{[...db.songs].reverse().slice(0, 60).map((s) => {
              const st = stats[s.id] || { w: 0, l: 0, m: 0 };
              return (<tr key={s.id}><td style={TD}>{s.title}</td><td style={{ ...TD, color: "#888" }}>{s.artist}</td><td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.year || "\u2014"}</td><td style={{ ...TD, textAlign: "right", fontSize: 12 }}>{st.m > 0 ? <span><span style={{ color: "#22863a" }}>{st.w}</span>-<span style={{ color: "#cb2431" }}>{st.l}</span></span> : <span style={{ color: "#ddd" }}>0-0</span>}</td></tr>);
            })}</tbody>
          </table>
          {db.songs.length > 60 && <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 8 }}>Showing 60 of {db.songs.length}</p>}
        </div>
      )}
    </div>
  );

  const Artists = () => {
    if (selArtist) {
      const a = artists.find((x) => x.name.toLowerCase() === selArtist.toLowerCase());
      if (!a) return null;
      const sorted = [...a.songs].sort((x, y) => y.pct - x.pct);
      const tw = sorted.reduce((ac, s) => ac + s.w, 0), tl = sorted.reduce((ac, s) => ac + s.l, 0);
      return (
        <div>
          <button style={{ ...bg, marginBottom: 14, fontSize: 12, padding: "6px 16px" }} onClick={() => setSelArtist(null)}>&larr; All Artists</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 3px" }}>{a.name}</h2>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px" }}>{a.songs.length} song{a.songs.length !== 1 ? "s" : ""} &middot; {tw}W-{tl}L combined</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={TH}>Song</th><th style={{ ...TH, textAlign: "right" }}>Year</th><th style={{ ...TH, textAlign: "right" }}>W-L</th><th style={{ ...TH, textAlign: "right" }}>Pct</th></tr></thead>
            <tbody>{sorted.map((s) => (<tr key={s.id}><td style={{ ...TD, fontWeight: 600 }}>{s.title}</td><td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.year || "\u2014"}</td><td style={{ ...TD, textAlign: "right" }}><span style={{ color: "#22863a" }}>{s.w}</span>-<span style={{ color: "#cb2431" }}>{s.l}</span></td><td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>{s.m >= 10 ? wp(s.w, s.l) + "%" : <span style={{ color: "#ccc" }}>{"\u2014"}</span>}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }

    // Artist image component
    const ArtistImg = ({ name, size = 48 }) => {
      const [url, setUrl] = useState(artCache["artist_" + name]);
      useEffect(() => {
        if (url !== undefined) return;
        const key = "artist_" + name;
        if (artCache[key] !== undefined) { setUrl(artCache[key]); return; }
        const q = encodeURIComponent(name);
        fetch(`https://itunes.apple.com/search?term=${q}&entity=musicArtist&limit=1`)
          .then(r => r.json())
          .then(data => {
            if (data.results?.[0]?.artistLinkUrl) {
              fetch(`https://itunes.apple.com/search?term=${q}&media=music&limit=1`)
                .then(r2 => r2.json())
                .then(d2 => {
                  const art = d2.results?.[0]?.artworkUrl100?.replace("100x100", "120x120") || null;
                  setArtCache(prev => ({ ...prev, [key]: art }));
                  setUrl(art);
                }).catch(() => { setArtCache(prev => ({ ...prev, [key]: null })); setUrl(null); });
            } else {
              setArtCache(prev => ({ ...prev, [key]: null })); setUrl(null);
            }
          }).catch(() => { setArtCache(prev => ({ ...prev, [key]: null })); setUrl(null); });
      }, [name, url]);

      if (url === undefined || url === null) return (
        <div style={{ width: size, height: size, borderRadius: size / 2, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: size * 0.38, color: "#ccc" }}>♪</span>
        </div>
      );
      return <img src={url} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flexShrink: 0 }} />;
    };

    return (
      <div>
        <p style={{ fontSize: 12, color: "#aaa", marginBottom: 14 }}>{artists.length} artists</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {artists.map((a) => {
            const tw = a.songs.reduce((ac, s) => ac + s.w, 0);
            const tl = a.songs.reduce((ac, s) => ac + s.l, 0);
            const tm = tw + tl;
            const pct = tm > 0 ? ((tw / tm) * 100).toFixed(1) : "0.0";
            const rankedSongs = a.songs.filter(s => s.m >= 10).sort((x, y) => y.pct - x.pct);
            const topSong = rankedSongs.length > 0 ? rankedSongs[0] : a.songs.sort((x, y) => y.pct - x.pct)[0];
            const topRank = topSong && ranked.indexOf(ranked.find(r => r.id === topSong.id)) + 1;
            return (
              <div key={a.name} onClick={() => setSelArtist(a.name)}
                style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, padding: "16px 14px", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <ArtistImg name={a.name} size={56} />
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{a.name}</div>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{a.songs.length} song{a.songs.length !== 1 ? "s" : ""}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 2 }}>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}><span style={{ color: "#22863a" }}>{tw}</span><span style={{ color: "#ccc" }}>-</span><span style={{ color: "#cb2431" }}>{tl}</span></div><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Record</div></div>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Win %</div></div>
                </div>
                {topSong && <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px solid #f0f0f0", width: "100%" }}><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Highest</div><div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>{topRank > 0 ? <span style={{ color: "#aaa", fontWeight: 400 }}>#{topRank} </span> : ""}{topSong.title}</div></div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Cleanup = () => {
    const [showArchive, setShowArchive] = useState(false);
    const [selected, setSelected] = useState({});
    const active = enriched.filter((s) => !s.archived);
    const archived = enriched.filter((s) => s.archived).sort((a, b) => (a.title + a.artist).toLowerCase().localeCompare((b.title + b.artist).toLowerCase()));
    const candidates = active.filter((s) => s.m >= 15 && s.pct < 0.35).sort((a, b) => a.pct - b.pct);

    const selCount = Object.values(selected).filter(Boolean).length;
    const allSelected = candidates.length > 0 && candidates.every(s => selected[s.id]);
    const toggleAll = () => {
      if (allSelected) { setSelected({}); }
      else { const n = {}; candidates.forEach(s => { n[s.id] = true; }); setSelected(n); }
    };
    const toggleOne = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }));

    const archiveSong = async (id) => {
      const ns = db.songs.map(s => s.id === id ? { ...s, archived: true } : s);
      await save({ ...db, songs: ns }); setDelConfirm(null);
    };
    const archiveSelected = async () => {
      const ids = Object.keys(selected).filter(id => selected[id]);
      if (ids.length === 0) return;
      const ns = db.songs.map(s => ids.includes(s.id) ? { ...s, archived: true } : s);
      await save({ ...db, songs: ns }); setSelected({}); setDelConfirm(null);
    };
    const restoreSong = async (id) => {
      const ns = db.songs.map(s => s.id === id ? { ...s, archived: false } : s);
      await save({ ...db, songs: ns });
    };
    const restoreAll = async () => {
      const ns = db.songs.map(s => s.archived ? { ...s, archived: false } : s);
      await save({ ...db, songs: ns });
    };

    const cbStyle = { width: 16, height: 16, accentColor: "#1a1a1a", cursor: "pointer" };

    if (showArchive) {
      return (
        <div>
          <button style={{ ...bg, marginBottom: 14, fontSize: 12, padding: "6px 16px" }} onClick={() => setShowArchive(false)}>&larr; Back to Cleanup</button>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Song Archive</h2>
            {archived.length > 0 && <button style={{ ...bg, fontSize: 11, padding: "5px 14px", color: "#22863a", borderColor: "#c8e6c9" }} onClick={restoreAll}>Restore All</button>}
          </div>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px" }}>Songs removed from the active pool. Their records are preserved.</p>
          {archived.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#bbb" }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Archive is empty</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={TH}>Song</th><th style={{ ...TH, textAlign: "right" }}>W-L</th><th style={{ ...TH, textAlign: "right" }}>Pct</th><th style={{ ...TH, textAlign: "center" }}></th></tr></thead>
              <tbody>{archived.map((s) => (
                <tr key={s.id}>
                  <td style={TD}><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 11, color: "#aaa" }}>{s.artist}{s.year ? ` \u00B7 ${s.year}` : ""}</div></td>
                  <td style={{ ...TD, textAlign: "right" }}><span style={{ color: "#22863a" }}>{s.w}</span>-<span style={{ color: "#cb2431" }}>{s.l}</span></td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>{s.m >= 10 ? wp(s.w, s.l) + "%" : <span style={{ color: "#ccc" }}>{wp(s.w, s.l)}%</span>}</td>
                  <td style={{ ...TD, textAlign: "center" }}>
                    <button style={{ ...bg, fontSize: 11, padding: "4px 12px", color: "#22863a", borderColor: "#c8e6c9" }} onClick={() => restoreSong(s.id)}>Restore</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <p style={{ fontSize: 11, color: "#ccc", marginTop: 10 }}>{archived.length} archived song{archived.length !== 1 ? "s" : ""}</p>
        </div>
      );
    }

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Cleanup</h2>
          <button style={{ ...bg, fontSize: 11, padding: "5px 14px" }} onClick={() => setShowArchive(true)}>
            View Archive{archived.length > 0 ? ` (${archived.length})` : ""}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px" }}>Songs with 15+ matchups and under 35% win rate. Archive them to remove from the active pool.</p>
        {candidates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", color: "#bbb" }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>No cleanup candidates right now</p>
            <p style={{ fontSize: 12 }}>All active songs with 15+ matchups are above 35%</p>
          </div>
        ) : (
          <div>
            {selCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#fef9ef", border: "1px solid #f5deb3", borderRadius: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{selCount} song{selCount !== 1 ? "s" : ""} selected</span>
                <button style={{ ...bp, fontSize: 12, padding: "6px 18px", background: "#e67e22" }} onClick={archiveSelected}>Archive Selected</button>
              </div>
            )}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ ...TH, width: 32, textAlign: "center" }}><input type="checkbox" checked={allSelected} onChange={toggleAll} style={cbStyle} /></th>
                  <th style={TH}>Song</th><th style={{ ...TH, textAlign: "right" }}>W-L</th><th style={{ ...TH, textAlign: "right" }}>Pct</th><th style={{ ...TH, textAlign: "right" }}>Elo</th><th style={{ ...TH, textAlign: "center" }}></th>
                </tr></thead>
                <tbody>{candidates.map((s) => (
                  <tr key={s.id} style={selected[s.id] ? { background: "#fefaf0" } : {}}>
                    <td style={{ ...TD, textAlign: "center" }}><input type="checkbox" checked={!!selected[s.id]} onChange={() => toggleOne(s.id)} style={cbStyle} /></td>
                    <td style={TD}><div style={{ fontWeight: 600 }}>{s.title}</div><div style={{ fontSize: 11, color: "#aaa" }}>{s.artist}{s.year ? ` \u00B7 ${s.year}` : ""}</div></td>
                    <td style={{ ...TD, textAlign: "right" }}><span style={{ color: "#22863a" }}>{s.w}</span>-<span style={{ color: "#cb2431" }}>{s.l}</span></td>
                    <td style={{ ...TD, textAlign: "right", fontWeight: 600, color: "#cb2431" }}>{wp(s.w, s.l)}%</td>
                    <td style={{ ...TD, textAlign: "right", color: "#7c6bbf", fontSize: 12 }}>{s.elo}</td>
                    <td style={{ ...TD, textAlign: "center" }}>
                      <button style={{ ...bg, fontSize: 11, padding: "4px 12px", color: "#e67e22", borderColor: "#f5deb3" }} onClick={() => archiveSong(s.id)}>Archive</button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: "#ccc", marginTop: 14 }}>{candidates.length} candidate{candidates.length !== 1 ? "s" : ""} for archive</p>
      </div>
    );
  };

  const Admin = () => {
    const allSorted = [...enriched].sort((a, b) => (a.title + a.artist).toLowerCase().localeCompare((b.title + b.artist).toLowerCase()));
    const filtered = search ? allSorted.filter((s) => (s.title + " " + s.artist).toLowerCase().includes(search.toLowerCase())) : allSorted;

    const startEdit = (s) => { setEditSong(s.id); setEditForm({ title: s.title, artist: s.artist, year: s.year ? String(s.year) : "" }); };
    const saveEdit = async () => {
      const ns = db.songs.map(s => s.id === editSong ? { ...s, title: editForm.title.trim(), artist: editForm.artist.trim(), year: editForm.year ? parseInt(editForm.year) || null : null } : s);
      await save({ ...db, songs: ns }); setEditSong(null);
    };
    const deleteSong = async (id) => {
      const ns = db.songs.filter(x => x.id !== id);
      const nm = db.matchups.filter(x => x.wi !== id && x.li !== id);
      await save({ ...db, songs: ns, matchups: nm }); setDelConfirm(null);
    };

    const inputStyle = { padding: "6px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 8, fontFamily: FONT, outline: "none", width: "100%", boxSizing: "border-box" };

    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>Admin</h2>
        <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 14px" }}>Edit song details or remove songs from the database.</p>
        <input type="text" placeholder="Search songs..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", padding: "9px 14px", fontSize: 13, border: "1px solid #e8e8e8", borderRadius: 10, fontFamily: FONT, boxSizing: "border-box", outline: "none", marginBottom: 14, background: "#fff" }} />
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={TH}>Song</th><th style={TH}>Artist</th><th style={{ ...TH, textAlign: "right" }}>Year</th><th style={{ ...TH, textAlign: "right" }}>GP</th><th style={{ ...TH, textAlign: "center" }}></th></tr></thead>
            <tbody>{filtered.slice(0, 80).map((s) => (
              editSong === s.id ? (
                <tr key={s.id} style={{ background: "#f9f9f5" }}>
                  <td style={TD}><input style={inputStyle} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></td>
                  <td style={TD}><input style={inputStyle} value={editForm.artist} onChange={(e) => setEditForm({ ...editForm, artist: e.target.value })} /></td>
                  <td style={{ ...TD, textAlign: "right" }}><input style={{ ...inputStyle, width: 60, textAlign: "right" }} value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} /></td>
                  <td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.m}</td>
                  <td style={{ ...TD, textAlign: "center" }}>
                    <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      <button style={{ ...bp, fontSize: 11, padding: "4px 12px" }} onClick={saveEdit}>Save</button>
                      <button style={{ ...bg, fontSize: 11, padding: "4px 10px" }} onClick={() => setEditSong(null)}>Cancel</button>
                    </span>
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td style={{ ...TD, fontWeight: 600 }}>{s.title}</td>
                  <td style={{ ...TD, color: "#888" }}>{s.artist}</td>
                  <td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.year || "\u2014"}</td>
                  <td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.m}</td>
                  <td style={{ ...TD, textAlign: "center" }}>
                    {delConfirm === s.id ? (
                      <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button style={{ ...bp, fontSize: 11, padding: "4px 10px", background: "#cb2431" }} onClick={() => deleteSong(s.id)}>Delete</button>
                        <button style={{ ...bg, fontSize: 11, padding: "4px 8px" }} onClick={() => setDelConfirm(null)}>No</button>
                      </span>
                    ) : (
                      <span style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                        <button style={{ ...bg, fontSize: 11, padding: "4px 10px" }} onClick={() => startEdit(s)}>Edit</button>
                        <button style={{ ...bg, fontSize: 11, padding: "4px 10px", color: "#cb2431", borderColor: "#f0d0d0" }} onClick={() => setDelConfirm(s.id)}>Del</button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            ))}</tbody>
          </table>
        </div>
        {filtered.length > 80 && <p style={{ fontSize: 11, color: "#ccc", textAlign: "center", marginTop: 8 }}>Showing 80 of {filtered.length}</p>}
        <p style={{ fontSize: 11, color: "#ccc", marginTop: 10 }}>{db.songs.length} songs total</p>
      </div>
    );
  };

  const Decades = () => {
    if (selDecade) {
      const d = decs.find((x) => x.d === selDecade);
      if (!d) return null;
      return (
        <div>
          <button style={{ ...bg, marginBottom: 14, fontSize: 12, padding: "6px 16px" }} onClick={() => setSelDecade(null)}>&larr; All Decades</button>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 3px" }}>{d.d}</h2>
          <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 18px" }}>{d.songs.length} songs</p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><th style={TH}>Song</th><th style={TH}>Artist</th><th style={{ ...TH, textAlign: "right" }}>Year</th><th style={{ ...TH, textAlign: "right" }}>W-L</th><th style={{ ...TH, textAlign: "right" }}>Pct</th></tr></thead>
            <tbody>{d.songs.map((s) => (<tr key={s.id}><td style={{ ...TD, fontWeight: 600 }}>{s.title}</td><td style={{ ...TD, color: "#888" }}>{s.artist}</td><td style={{ ...TD, textAlign: "right", color: "#aaa" }}>{s.year}</td><td style={{ ...TD, textAlign: "right" }}><span style={{ color: "#22863a" }}>{s.w}</span>-<span style={{ color: "#cb2431" }}>{s.l}</span></td><td style={{ ...TD, textAlign: "right", fontWeight: 600 }}>{s.m >= 10 ? wp(s.w, s.l) + "%" : <span style={{ color: "#ccc" }}>{"\u2014"}</span>}</td></tr>))}</tbody>
          </table>
        </div>
      );
    }
    const noY = db.songs.filter((s) => !s.year && !s.archived).length;
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {decs.map((d) => {
            const tw = d.songs.reduce((ac, s) => ac + s.w, 0);
            const tl = d.songs.reduce((ac, s) => ac + s.l, 0);
            const tm = tw + tl;
            const pct = tm > 0 ? ((tw / tm) * 100).toFixed(1) : "0.0";
            const rankedSongs = d.songs.filter(s => s.m >= 10).sort((x, y) => y.pct - x.pct);
            const topSong = rankedSongs.length > 0 ? rankedSongs[0] : d.songs.sort((x, y) => y.pct - x.pct)[0];
            const topRank = topSong && ranked.indexOf(ranked.find(r => r.id === topSong.id)) + 1;
            return (
              <div key={d.d} onClick={() => setSelDecade(d.d)}
                style={{ background: "#fff", border: "1px solid #ebebeb", borderRadius: 14, padding: "16px 14px", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 8 }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#ebebeb"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: 24, fontWeight: 700 }}>{d.d}</div>
                <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{d.songs.length} song{d.songs.length !== 1 ? "s" : ""}</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 2 }}>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}><span style={{ color: "#22863a" }}>{tw}</span><span style={{ color: "#ccc" }}>-</span><span style={{ color: "#cb2431" }}>{tl}</span></div><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Record</div></div>
                  <div><div style={{ fontSize: 15, fontWeight: 700 }}>{pct}%</div><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Win %</div></div>
                </div>
                {topSong && <div style={{ marginTop: 4, paddingTop: 6, borderTop: "1px solid #f0f0f0", width: "100%" }}><div style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Highest</div><div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.3 }}>{topRank > 0 ? <span style={{ color: "#aaa", fontWeight: 400 }}>#{topRank} </span> : ""}{topSong.title}</div></div>}
              </div>
            );
          })}
        </div>
        {noY > 0 && <p style={{ fontSize: 11, color: "#ccc", marginTop: 14, textAlign: "center" }}>{noY} songs without a year</p>}
      </div>
    );
  };

  if (loading) return <div style={{ maxWidth: 720, margin: "0 auto", padding: "80px 16px", textAlign: "center", color: "#ccc", fontFamily: FONT }}>Loading...</div>;

  const nav = [["compare", "Compare"], ["standings", "Standings"], ["add", "Add Songs"], ["artists", "Artists"], ["decades", "Decades"], ["cleanup", "Cleanup"], ["admin", "Admin"]];

  return (
    <div style={{ fontFamily: FONT, maxWidth: 720, margin: "0 auto", padding: "24px 16px", minHeight: "100vh", background: "#FAFAF9", color: "#1a1a1a" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px", color: "#111", margin: 0 }}>Opus</h1>
        <p style={{ fontSize: 12, color: "#aaa", margin: "3px 0 0" }}>find which songs are your favorites</p>
      </div>
      <nav style={{ display: "flex", gap: 3, justifyContent: "center", margin: "18px 0 26px", flexWrap: "wrap" }}>
        {nav.map(([id, label]) => (<button key={id} style={pill(pg === id)} onClick={() => { setPg(id); setSearch(""); setEditSong(null); setDelConfirm(null); if (id === "compare") setPair(null); if (id === "artists") setSelArtist(null); if (id === "decades") setSelDecade(null); }}>{label}</button>))}
      </nav>
      {pg === "compare" && <Compare />}
      {pg === "standings" && <Standings />}
      {pg === "add" && <Add />}
      {pg === "artists" && <Artists />}
      {pg === "decades" && <Decades />}
      {pg === "cleanup" && <Cleanup />}
      {pg === "admin" && <Admin />}
    </div>
  );
}
