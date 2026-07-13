import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search,
  Plus,
  MapPin,
  CalendarDays,
  UserRound,
  PawPrint,
  Menu,
  X,
  ArrowRight,
  Clock3,
  CheckCircle2,
  Upload,
  Mail,
  Lock,
  ChevronDown,
  SlidersHorizontal,
  HeartHandshake,
  Home,
  MessageCircle,
  Send,
  ImagePlus,
  Inbox,
  LayoutList,
  Phone,
  Trash2,
} from "lucide-react";
import "./styles.css";

const AREAS = [
  "Keskusta",
  "Tuira",
  "Raksila",
  "Kaijonharju",
  "Linnanmaa",
  "Haukipudas",
  "Kiiminki",
  "Oulunsalo",
  "Muu Oulu",
];

function App() {
  const [data, setData] = useState([]),
    [user, setUser] = useState(null),
    [view, setView] = useState("home"),
    [login, setLogin] = useState(false),
    [pending, setPending] = useState(null),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [messages, setMessages] = useState([]),
    [active, setActive] = useState(null);
  const go = (v) => {
    setView(v);
    setMenu(false);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const notify = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2800);
  };
  const protectedGo = (v) => {
    if (!user) {
      setPending(v);
      setLogin("register");
    } else go(v);
  };
  const auth = (u) => {
    setUser(u);
    setLogin(false);
    notify(`Tervetuloa, ${u.username}`);
    if (pending) {
      go(pending);
      setPending(null);
    }
  };
  const add = (n) => {
    setData([
      {
        ...n,
        id: Date.now(),
        date: new Date().toLocaleDateString("fi-FI"),
        created: Date.now(),
        user: user.username,
        owner: user.email,
        comments: [],
      },
      ...data,
    ]);
    notify("Ilmoitus julkaistiin");
    go("mine");
  };
  const remove = (id) => {
    setData(data.filter((n) => n.id !== id));
    notify("Ilmoitus poistettiin");
  };
  return (
    <div className="app">
      <Header
        user={user}
        view={view}
        go={go}
        protectedGo={protectedGo}
        setLogin={setLogin}
        menu={menu}
        setMenu={setMenu}
      />
      <main>
        {view === "home" && (
          <HomePage go={go} protectedGo={protectedGo} count={data.length} />
        )}
        {view === "notices" && <Notices data={data} open={setActive} />}
        {view === "new" && <NewNotice onSubmit={add} />}
        {view === "mine" && (
          <Mine
            data={data.filter((n) => n.owner === user?.email)}
            open={setActive}
            remove={remove}
            protectedGo={protectedGo}
          />
        )}
        {view === "messages" && <Messages messages={messages} user={user} />}
        {view === "info" && <Info />}
      </main>
      <Footer go={go} />
      {login && (
        <Auth
          initialMode={login}
          close={() => {
            setLogin(false);
            setPending(null);
          }}
          login={auth}
        />
      )}
      {active && (
        <NoticeDetail
          notice={active}
          close={() => setActive(null)}
          user={user}
          requireLogin={() => {
            setActive(null);
            setPending("notices");
            setLogin(true);
          }}
          update={(updated) => {
            setData(data.map((n) => (n.id === updated.id ? updated : n)));
            setActive(updated);
          }}
          message={(to, text) => {
            setMessages([
              ...messages,
              { id: Date.now(), to, from: user.username, text, date: "Nyt" },
            ]);
            notify("Yksityisviesti lähetettiin");
          }}
        />
      )}
      {toast && (
        <div className="toast">
          <CheckCircle2 />
          {toast}
        </div>
      )}
    </div>
  );
}

function Header({ user, view, go, protectedGo, setLogin, menu, setMenu }) {
  return (
    <header>
      <button className="brand" onClick={() => go("home")}>
        <span className="brandmark">
          <Search size={23} />
        </span>
        <span>
          Kadonneet <b>Oulu</b>
        </span>
      </button>
      <nav className={menu ? "open" : ""}>
        <button
          className={view === "home" ? "navactive" : ""}
          onClick={() => go("home")}
        >
          <Home /> Etusivu
        </button>
        <button onClick={() => go("notices")}>Ilmoitukset</button>
        <button onClick={() => go("info")}>Ohjeet</button>
        {user && (
          <>
            <button onClick={() => go("mine")}>Omat ilmoitukset</button>
            <button onClick={() => go("messages")}>Viestit</button>
          </>
        )}
        {!user && (
          <>
            <button className="mobile-login" onClick={() => setLogin("login")}>
              Kirjaudu
            </button>
            <button
              className="mobile-login"
              onClick={() => setLogin("register")}
            >
              Rekisteröidy
            </button>
          </>
        )}
      </nav>
      <div className="header-actions">
        {user ? (
          <button className="login" onClick={() => go("mine")}>
            <UserRound size={18} />
            {user.username}
          </button>
        ) : (
          <>
            <button className="login" onClick={() => setLogin("login")}>
              <UserRound size={18} />
              Kirjaudu
            </button>
            <button
              className="registerbtn"
              onClick={() => setLogin("register")}
            >
              Rekisteröidy
            </button>
          </>
        )}
        <button className="primary small" onClick={() => protectedGo("new")}>
          <Plus size={18} /> Tee ilmoitus
        </button>
        <button className="menub" onClick={() => setMenu(!menu)}>
          {menu ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

function HomePage({ go, protectedGo, count }) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <HeartHandshake size={17} /> Paikallinen ilmoituspalvelu
          </span>
          <h1>
            Kun joku tärkeä
            <br />
            on kadonnut.
          </h1>
          <p>
            Ilmoita kadonneesta ihmisestä tai eläimestä Oulun alueella. Palvelu
            on maksuton ja tarkoitettu kaikille.
          </p>
          <div className="hero-actions">
            <button className="primary" onClick={() => protectedGo("new")}>
              <Plus /> Tee ilmoitus
            </button>
            <button className="secondary" onClick={() => go("notices")}>
              Selaa ilmoituksia <ArrowRight />
            </button>
          </div>
          <div className="emergency">
            <b>Onko kyseessä hätätilanne?</b> Soita aina ensin hätänumeroon{" "}
            <strong>112</strong>.
          </div>
        </div>
        <div className="hero-art">
          <span className="location-pill">
            <MapPin /> Oulun seutu
          </span>
        </div>
      </section>
      <section className="quick">
        <div>
          <b>{count}</b>
          <span>Julkaistua ilmoitusta</span>
        </div>
        <div>
          <b>2</b>
          <span>Ilmoitustyyppiä: ihmiset ja eläimet</span>
        </div>
        <div>
          <b>14 vrk</b>
          <span>Ilmoituksen voimassaoloaika</span>
        </div>
      </section>
      <section className="latest emptyhome">
        <span className="kicker">ILMOITUKSET</span>
        <h2>
          {count ? "Katso uusimmat ilmoitukset" : "Ei julkaistuja ilmoituksia"}
        </h2>
        <p>
          {count
            ? "Avaa ilmoituslista nähdäksesi kaikki ilmoitukset."
            : "Ilmoituksia ei ole vielä julkaistu."}
        </p>
        <button className="secondary" onClick={() => go("notices")}>
          Avaa ilmoitukset <ArrowRight />
        </button>
      </section>
    </>
  );
}

function Notices({ data, open }) {
  const [category, setCategory] = useState("Kaikki"),
    [query, setQuery] = useState(""),
    [areas, setAreas] = useState([]),
    [filters, setFilters] = useState(false),
    [sort, setSort] = useState("new");
  const toggle = (a) =>
    setAreas(areas.includes(a) ? areas.filter((x) => x !== a) : [...areas, a]);
  const filtered = useMemo(
    () =>
      data
        .filter(
          (n) =>
            (category === "Kaikki" || n.type === category) &&
            (!areas.length || areas.includes(n.area)) &&
            `${n.name} ${n.area} ${n.desc}`
              .toLowerCase()
              .includes(query.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "new" ? b.created - a.created : a.created - b.created,
        ),
    [data, category, query, areas, sort],
  );
  return (
    <section className="page">
      <div className="pagehead">
        <span className="kicker">KADONNEET OULUN ALUEELLA</span>
        <h1>Ilmoitukset</h1>
        <p>Rajaa tuloksia kategorian, alueen ja julkaisuajan perusteella.</p>
      </div>
      <div className="filters">
        <div className="searchbox">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hae nimellä, alueella tai tuntomerkeillä"
          />
        </div>
        <div className="tabs">
          {["Kaikki", "Eläin", "Ihminen"].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          className={`filterbtn ${filters ? "active" : ""}`}
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal /> Rajaa hakua
        </button>
      </div>
      {filters && (
        <div className="filterpanel">
          <b>Missä päin Oulua?</b>
          <p>Voit valita useita alueita.</p>
          <div className="checks">
            {AREAS.map((a) => (
              <label key={a}>
                <input
                  type="checkbox"
                  checked={areas.includes(a)}
                  onChange={() => toggle(a)}
                />
                <span>{a}</span>
              </label>
            ))}
          </div>
          {areas.length > 0 && (
            <button className="clearfilters" onClick={() => setAreas([])}>
              Tyhjennä aluevalinnat
            </button>
          )}
        </div>
      )}
      <div className="resultrow">
        <b>{filtered.length} ilmoitusta</b>
        <label className="sort">
          Järjestä:
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="new">Uusimmat ensin</option>
            <option value="old">Vanhimmat ensin</option>
          </select>
          <ChevronDown />
        </label>
      </div>
      {filtered.length ? (
        <div className="cards listing">
          {filtered.map((n) => (
            <Card n={n} key={n.id} open={() => open(n)} />
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}

function Empty() {
  return (
    <div className="empty">
      <LayoutList />
      <h3>Ilmoituksia ei ole</h3>
      <p>
        Hakuehdoilla ei löytynyt ilmoituksia tai yhtään ilmoitusta ei ole vielä
        julkaistu.
      </p>
    </div>
  );
}
function Card({ n, open, remove }) {
  return (
    <article className={`card ${n.found ? "found" : ""}`} onClick={open}>
      <div className="photo">
        {n.preview ? (
          <img src={n.preview} />
        ) : (
          <div className="noimage">
            {n.type === "Eläin" ? <PawPrint /> : <UserRound />}
            <span>Ei kuvaa</span>
          </div>
        )}
        <span className={`tag ${n.type === "Ihminen" ? "person" : ""}`}>
          {n.type}
        </span>
        {n.found && (
          <span className="foundtag">
            <CheckCircle2 /> Löytynyt
          </span>
        )}
      </div>
      <div className="card-body">
        <h3>{n.name}</h3>
        <div className="meta">
          <span>
            <MapPin /> {n.area}
          </span>
          <span>
            <CalendarDays /> {n.date}
          </span>
        </div>
        <p>{n.desc}</p>
        <div className="author">
          <span>{n.user?.[0]}</span> Ilmoittaja: <b>{n.user}</b>
          <MessageCircle /> {n.comments?.length || 0}
        </div>
        {remove && (
          <button
            className="deletebtn"
            onClick={(e) => {
              e.stopPropagation();
              remove(n.id);
            }}
          >
            <Trash2 /> Poista ilmoitus
          </button>
        )}
      </div>
    </article>
  );
}

function NewNotice({ onSubmit }) {
  const [f, setF] = useState({
    type: "Eläin",
    name: "",
    area: "",
    desc: "",
    phone: "",
    contactEmail: "",
    preview: "",
  });
  const submit = (e) => {
    e.preventDefault();
    onSubmit(f);
  };
  return (
    <section className="page narrow">
      <div className="pagehead">
        <span className="kicker">UUSI ILMOITUS</span>
        <h1>Ilmoita kadonneesta</h1>
        <p>
          Täytä tiedot huolellisesti. Yhteystietoja käytetään havaintojen
          ilmoittamiseen.
        </p>
      </div>
      <form className="noticeform" onSubmit={submit}>
        <FormBlock no="1" title="Kenestä ilmoitat?">
          <div className="typechoice">
            {["Eläin", "Ihminen"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setF({ ...f, type: t })}
                className={f.type === t ? "selected" : ""}
              >
                {t === "Eläin" ? <PawPrint /> : <UserRound />}
                <b>{t}</b>
                <span>
                  {t === "Eläin"
                    ? "Koira, kissa tai muu eläin"
                    : "Kadonnut henkilö"}
                </span>
              </button>
            ))}
          </div>
        </FormBlock>
        <FormBlock no="2" title="Tiedot ja tuntomerkit">
          <div className="fieldgrid">
            <label>
              Nimi *
              <input
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>
            <label>
              Katoamisalue *
              <select
                required
                value={f.area}
                onChange={(e) => setF({ ...f, area: e.target.value })}
              >
                <option value="">Valitse alue</option>
                {AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Tiedot ja tuntomerkit *
              <textarea
                required
                maxLength="600"
                value={f.desc}
                onChange={(e) => setF({ ...f, desc: e.target.value })}
              />
              <small>{f.desc.length}/600 merkkiä</small>
            </label>
          </div>
        </FormBlock>
        <FormBlock no="3" title="Yhteystiedot">
          <div className="fieldgrid">
            <label>
              Puhelinnumero
              <div className="inputicon">
                <Phone />
                <input
                  value={f.phone}
                  onChange={(e) => setF({ ...f, phone: e.target.value })}
                  placeholder="Esim. 040 123 4567"
                />
              </div>
            </label>
            <label>
              Sähköpostiosoite *
              <div className="inputicon">
                <Mail />
                <input
                  required
                  type="email"
                  value={f.contactEmail}
                  onChange={(e) => setF({ ...f, contactEmail: e.target.value })}
                />
              </div>
            </label>
          </div>
          <p className="privacyhint">
            Näytettävät yhteystiedot ovat ilmoituksen yhteydessä. Voit
            vastaanottaa havaintoja myös yksityisviestillä.
          </p>
        </FormBlock>
        <FormBlock no="4" title="Valokuva">
          <label className="upload">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) setF({ ...f, preview: URL.createObjectURL(file) });
              }}
            />
            {f.preview ? (
              <img src={f.preview} />
            ) : (
              <>
                <Upload />
                <b>Lisää valokuva</b>
                <span>JPG tai PNG, enintään 10 Mt</span>
              </>
            )}
          </label>
        </FormBlock>
        <div className="formactions">
          <button className="primary">
            Julkaise ilmoitus <ArrowRight />
          </button>
        </div>
        <p className="expiry">
          <Clock3 /> Ilmoitus poistuu automaattisesti 14 vuorokauden kuluttua.
        </p>
      </form>
    </section>
  );
}
function FormBlock({ no, title, children }) {
  return (
    <div className="formsection">
      <span className="formnum">{no}</span>
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Auth({ close, login, initialMode }) {
  const [register, setRegister] = useState(initialMode === "register"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [username, setUsername] = useState("");
  const submit = (e) => {
    e.preventDefault();
    login({
      email,
      username: register
        ? username
        : localStorage.getItem("ko_username") || email.split("@")[0],
    });
    if (register) localStorage.setItem("ko_username", username);
  };
  return (
    <div className="modalback">
      <form className="modal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X />
        </button>
        <div className="modalbrand">
          <span className="brandmark">
            <UserRound />
          </span>
        </div>
        <h2>{register ? "Luo käyttäjätili" : "Kirjaudu sisään"}</h2>
        <p>
          {register
            ? "Ilmoituksen tekeminen vaatii käyttäjätilin."
            : "Kirjaudu samalla sähköpostilla, jolla loit käyttäjätilin."}
        </p>
        {register && (
          <label>
            Käyttäjänimi *
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nimi, joka näkyy ilmoituksissa"
            />
          </label>
        )}
        <label>
          Sähköpostiosoite *
          <div className="inputicon">
            <Mail />
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </label>
        <label>
          Salasana *
          <div className="inputicon">
            <Lock />
            <input
              required
              minLength="8"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </label>
        <button className="primary wide">
          {register ? "Luo käyttäjätili ja jatka" : "Kirjaudu sisään"}
        </button>
        <p className="switch">
          {register
            ? "Onko sinulla jo käyttäjätili?"
            : "Eikö sinulla ole käyttäjätiliä?"}{" "}
          <button type="button" onClick={() => setRegister(!register)}>
            {register ? "Kirjaudu sisään" : "Rekisteröidy"}
          </button>
        </p>
      </form>
    </div>
  );
}

function NoticeDetail({ notice, close, user, requireLogin, update, message }) {
  const [text, setText] = useState(""),
    [image, setImage] = useState(""),
    [dm, setDm] = useState(false);
  const comment = () => {
    if (!user) return requireLogin();
    if (!text && !image) return;
    const n = {
      ...notice,
      comments: [
        ...(notice.comments || []),
        { id: Date.now(), user: user.username, text, image },
      ],
    };
    update(n);
    setText("");
    setImage("");
  };
  return (
    <div className="modalback detailback">
      <div className="detail">
        <button className="close" onClick={close}>
          <X />
        </button>
        <div className="detailtop">
          {notice.preview ? (
            <img src={notice.preview} />
          ) : (
            <div className="noimage">
              <ImagePlus />
              <span>Ei kuvaa</span>
            </div>
          )}
          <div>
            <span className="tag static">{notice.type}</span>
            <h2>{notice.name}</h2>
            <p className="detailmeta">
              <MapPin /> {notice.area} · {notice.date}
            </p>
            <p>{notice.desc}</p>
            <div className="contacts">
              <b>Yhteystiedot</b>
              {notice.phone && (
                <a href={`tel:${notice.phone}`}>
                  <Phone /> {notice.phone}
                </a>
              )}
              <a href={`mailto:${notice.contactEmail}`}>
                <Mail /> {notice.contactEmail}
              </a>
            </div>
            <button
              className="primary"
              onClick={() => (user ? setDm(true) : requireLogin())}
            >
              <Send /> Lähetä yksityisviesti
            </button>
          </div>
        </div>
        {dm && (
          <div className="dm">
            <h3>Yksityisviesti käyttäjälle {notice.user}</h3>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Kirjoita viesti"
            />
            <button
              className="primary"
              onClick={() => {
                message(notice.user, text);
                setDm(false);
                setText("");
              }}
            >
              Lähetä
            </button>
          </div>
        )}
        <div className="comments">
          <h3>
            <MessageCircle /> Havainnot ja kommentit
          </h3>
          {notice.comments?.map((c) => (
            <div className="comment" key={c.id}>
              <b>{c.user}</b>
              {c.text && <p>{c.text}</p>}
              {c.image && <img src={c.image} />}
            </div>
          ))}
          {!notice.comments?.length && <p className="muted">Ei kommentteja.</p>}
          <textarea
            value={dm ? "" : text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kirjoita havainto tai kommentti"
            disabled={dm}
          />
          <div className="commentactions">
            <label>
              <ImagePlus /> Lisää kuva
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) setImage(URL.createObjectURL(f));
                }}
              />
            </label>
            {image && <span>Kuva valittu</span>}
            <button className="primary" onClick={comment}>
              <Send /> Lähetä
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mine({ data, open, remove, protectedGo }) {
  return (
    <section className="page">
      <div className="pagehead">
        <span className="kicker">KÄYTTÄJÄTILI</span>
        <h1>Omat ilmoitukset</h1>
        <p>Hallinnoi julkaisujasi ja seuraa niihin tulleita kommentteja.</p>
      </div>
      <div className="minebar">
        <button className="primary" onClick={() => protectedGo("new")}>
          <Plus /> Tee uusi ilmoitus
        </button>
      </div>
      {data.length ? (
        <div className="cards listing">
          {data.map((n) => (
            <Card key={n.id} n={n} open={() => open(n)} remove={remove} />
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}
function Messages({ messages }) {
  return (
    <section className="page narrow">
      <div className="pagehead">
        <span className="kicker">YKSITYISVIESTIT</span>
        <h1>Viestit</h1>
        <p>Ilmoituksiin liittyvät yksityiset keskustelut näkyvät täällä.</p>
      </div>
      {messages.length ? (
        messages.map((m) => (
          <div className="messageitem" key={m.id}>
            <span>
              <UserRound />
            </span>
            <div>
              <b>Vastaanottaja: {m.to}</b>
              <p>{m.text}</p>
              <small>{m.date}</small>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">
          <Inbox />
          <h3>Ei viestejä</h3>
          <p>Lähettämäsi ja vastaanottamasi viestit näkyvät täällä.</p>
        </div>
      )}
    </section>
  );
}
function Info() {
  return (
    <section className="page narrow prose">
      <div className="pagehead">
        <span className="kicker">TOIMINTAOHJEET</span>
        <h1>Näin käytät palvelua</h1>
      </div>
      <div className="infobox warning">
        <strong>Hätätilanteessa soita aina numeroon 112.</strong>
        <p>Palvelu ei korvaa viranomaisille tehtävää ilmoitusta.</p>
      </div>
      {[
        [
          "Tee ilmoitus",
          "Rekisteröidy, lisää tuntomerkit, katoamisalue, yhteystiedot ja mahdollinen valokuva.",
        ],
        [
          "Seuraa havaintoja",
          "Kommentit ja yksityisviestit auttavat havaintojen vastaanottamisessa.",
        ],
        [
          "Merkitse löytyneeksi",
          "Löytyneeksi merkitty ilmoitus poistetaan viiden vuorokauden kuluessa.",
        ],
      ].map(([h, p]) => (
        <div className="guide" key={h}>
          <h2>{h}</h2>
          <p>{p}</p>
        </div>
      ))}
    </section>
  );
}
function Footer({ go }) {
  return (
    <footer>
      <div className="footer-brand">
        <div className="brand">
          <span className="brandmark">
            <Search />
          </span>
          <span>
            Kadonneet <b>Oulu</b>
          </span>
        </div>
        <p>
          Paikallinen palvelu kadonneiden ihmisten ja eläinten löytämiseksi.
        </p>
      </div>
      <div>
        <b>Palvelu</b>
        <button onClick={() => go("home")}>Etusivu</button>
        <button onClick={() => go("notices")}>Ilmoitukset</button>
      </div>
      <div className="footer-help">
        <b>Hätätilanteessa</b>
        <p>Soita hätänumeroon</p>
        <strong>112</strong>
      </div>
      <small>© 2026 Kadonneet Oulu</small>
    </footer>
  );
}
createRoot(document.getElementById("root")).render(<App />);
