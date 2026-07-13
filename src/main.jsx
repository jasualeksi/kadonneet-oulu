import React, { useEffect, useMemo, useState } from "react";
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
  Bike,
  Package,
  Euro,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import "./styles.css";
import { accountFromUser, supabase, supabaseConfigured } from "./supabase";
import { validateUsername } from "./usernameModeration";
import {
  createComment,
  createMessage,
  createNotice,
  fetchMessages,
  fetchNotices,
  removeNotice,
  setNoticeFound,
} from "./dataService";

const AREAS = [
  "Haukipudas",
  "Jokikylä",
  "Martinniemi",
  "Haukkasuo",
  "Hiukkavaara",
  "Kivikkokangas",
  "Lapinkangas",
  "Niiles",
  "Puolukkakangas",
  "Saarela",
  "Sanginsuu",
  "Sankijoki",
  "Ulkosanki",
  "Vanha Hiukkavaara",
  "Jääli",
  "Välikylä",
  "Kaakkuri",
  "Kiviniemi",
  "Metsokangas",
  "Perävainio",
  "Kaijonharju",
  "Kuivasjärvi",
  "Liikanen",
  "Linnanmaa",
  "Ritaharju",
  "Kontinkangas",
  "Oulunsuu",
  "Peltola",
  "Värttö",
  "Höyhtyä",
  "Karjasilta",
  "Lintula",
  "Mäntylä",
  "Nokela",
  "Hiironen",
  "Kaukovainio",
  "Hollihaka",
  "Intiö",
  "Leveri",
  "Limingantulli",
  "Myllytulli",
  "Nuottasaari",
  "Pokkinen",
  "Raksila",
  "Vaara",
  "Vanhatulli",
  "Äimärautio",
  "Kalimenkylä",
  "Kello",
  "Alakylä",
  "Hannus",
  "Huttukylä",
  "Kiiminki",
  "Heikinharju",
  "Hönttämäki",
  "Korvenkylä",
  "Korvensuora",
  "Rusko",
  "Ruskonselkä",
  "Saviharju",
  "Talvikangas",
  "Hangaskangas",
  "Heikkilänkangas",
  "Iinatti",
  "Juurusoja",
  "Knuutila",
  "Madekoski",
  "Maikkula",
  "Pikkarala",
  "Haapalehto",
  "Hintta",
  "Kirkkokangas",
  "Kynsilehto",
  "Laanila",
  "Myllyoja",
  "Parkkisenkangas",
  "Kylänpuoli",
  "Oulunsalo",
  "Salonpää",
  "Isko",
  "Puolivälinkangas",
  "Pyykösjärvi",
  "Takalaanila",
  "Välivainio",
  "Herukka",
  "Pateniemi",
  "Rajakylä",
  "Alppila",
  "Hietasaari",
  "Koskela",
  "Koskikeskus",
  "Pikisaari",
  "Taskila",
  "Toppila",
  "Toppilansaari",
  "Tuira",
  "Vihreäsaari",
  "Pahkala",
  "Tannila",
  "Yli-Ii",
  "Jolos",
  "Nuoritta",
  "Vepsä",
  "Vesala",
  "Vuotto",
  "Ylikiiminki",
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
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(accountFromUser(session?.user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(accountFromUser(session?.user));
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!supabase) return;
    fetchNotices()
      .then(setData)
      .catch(() => notify("Ilmoituksia ei voitu ladata tietokannasta"));
  }, []);
  useEffect(() => {
    if (!supabase || !user?.id) {
      setMessages([]);
      return;
    }
    fetchMessages(user.id)
      .then(setMessages)
      .catch(() => notify("Viestejä ei voitu ladata"));
  }, [user?.id]);
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
    if (!user || !user.emailConfirmed) {
      setPending(v);
      setLogin("register");
    } else go(v);
  };
  const auth = (authUser) => {
    const u = accountFromUser(authUser);
    setUser(u);
    setLogin(false);
    notify(`Tervetuloa, ${u.username}`);
    if (pending) {
      go(pending);
      setPending(null);
    }
  };
  const add = async (form) => {
    try {
      const notice = await createNotice(form, user);
      setData((current) => [notice, ...current]);
      notify("Ilmoitus julkaistiin");
      go("mine");
    } catch (error) {
      notify(`Ilmoituksen julkaisu epäonnistui: ${error.message}`);
    }
  };
  const remove = async (id) => {
    try {
      await removeNotice(id);
      setData((current) => current.filter((n) => n.id !== id));
      notify("Ilmoitus poistettiin");
    } catch {
      notify("Ilmoitusta ei voitu poistaa");
    }
  };
  const markFound = async (id) => {
    try {
      const updated = await setNoticeFound(id);
      setData((current) => current.map((n) => (n.id === id ? updated : n)));
      notify("Ilmoitus merkittiin löytyneeksi");
    } catch {
      notify("Ilmoitusta ei voitu päivittää");
    }
  };
  const addNoticeComment = async (noticeId, text, file) => {
    const comment = await createComment(noticeId, text, file, user);
    const applyComment = (notice) =>
      notice.id === noticeId
        ? { ...notice, comments: [...(notice.comments || []), comment] }
        : notice;
    setData((current) => current.map(applyComment));
    setActive((current) => (current ? applyComment(current) : current));
    notify("Kommentti lähetettiin");
  };
  const sendPrivateMessage = async (recipientId, recipientName, text) => {
    const sent = await createMessage(recipientId, recipientName, text, user);
    setMessages((current) => [sent, ...current]);
    notify("Yksityisviesti lähetettiin");
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
          <HomePage go={go} protectedGo={protectedGo} data={data} />
        )}
        {view === "notices" && <Notices data={data} open={setActive} />}
        {view === "new" && <NewNotice onSubmit={add} />}
        {view === "mine" && (
          <Mine
            data={data.filter((n) => n.owner === user?.id)}
            open={setActive}
            remove={remove}
            markFound={markFound}
            protectedGo={protectedGo}
          />
        )}
        {view === "messages" && <Messages messages={messages} user={user} />}
        {view === "settings" && (
          <AccountSettings
            user={user}
            updateUser={setUser}
            notify={notify}
            logout={async () => {
              await supabase?.auth.signOut();
              setUser(null);
              go("home");
              notify("Kirjauduit ulos");
            }}
          />
        )}
        {view === "info" && <Info />}
      </main>
      <Footer go={go} protectedGo={protectedGo} />
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
          addComment={addNoticeComment}
          message={sendPrivateMessage}
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
            <button onClick={() => go("settings")}>
              <Settings /> Asetukset
            </button>
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
          <button className="login" onClick={() => go("settings")}>
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

function HomePage({ go, protectedGo, data }) {
  const count = data.length;
  const latest = data.length
    ? [...data].sort((a, b) => b.created - a.created)[0].date
    : "–";
  const foundCount = data.filter((notice) => notice.found).length;
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
            Ilmoita kadonneesta ihmisestä, eläimestä, menopelistä tai tavarasta
            Oulun alueella. Palvelu on maksuton ja tarkoitettu kaikille oululaisille.
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
          <b>{latest}</b>
          <span>Uusin ilmoitus</span>
        </div>
        <div>
          <b>{foundCount}</b>
          <span>Löytyneeksi merkittyä</span>
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
            placeholder="Hae otsikolla, alueella tai tuntomerkeillä"
          />
        </div>
        <div className="tabs">
          {["Kaikki", "Eläin", "Ihminen", "Menopeli", "Tavara"].map((c) => (
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

function TypeIcon({ type }) {
  if (type === "Eläin") return <PawPrint />;
  if (type === "Menopeli") return <Bike />;
  if (type === "Tavara") return <Package />;
  return <UserRound />;
}

function Card({ n, open, remove, markFound }) {
  return (
    <article className={`card ${n.found ? "found" : ""}`} onClick={open}>
      <div className="photo">
        {n.preview ? (
          <img src={n.preview} />
        ) : (
          <div className="noimage">
            <TypeIcon type={n.type} />
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
        <div className={`reward ${n.reward ? "has-reward" : "no-reward"}`}>
          <span><Euro /> Löytöpalkkio</span>
          <b>{n.reward ? `${Number(n.reward).toLocaleString("fi-FI")} €` : "—"}</b>
        </div>
        <div className="author">
          <span>{n.user?.[0]}</span> Ilmoittaja: <b>{n.user}</b>
          <MessageCircle /> {n.comments?.length || 0}
        </div>
        {markFound && !n.found && (
          <button
            className="foundbtn"
            onClick={(e) => {
              e.stopPropagation();
              markFound(n.id);
            }}
          >
            <CheckCircle2 /> Merkitse löytyneeksi
          </button>
        )}
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
    reward: "",
    preview: "",
    imageFile: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(f);
    setSubmitting(false);
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
        <FormBlock no="1" title="Mitä ilmoitus koskee?">
          <div className="typechoice">
            {["Eläin", "Ihminen", "Menopeli", "Tavara"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setF({ ...f, type: t })}
                className={f.type === t ? "selected" : ""}
              >
                <TypeIcon type={t} />
                <b>{t}</b>
                <span>
                  {{
                    Eläin: "Koira, kissa tai muu eläin",
                    Ihminen: "Kadonnut henkilö",
                    Menopeli: "Pyörä, mopo tai muu menopeli",
                    Tavara: "Kadonnut esine tai muu tavara",
                  }[t]}
                </span>
              </button>
            ))}
          </div>
        </FormBlock>
        <FormBlock no="2" title="Ilmoituksen tiedot">
          <div className="fieldgrid">
            <label>
              Ilmoituksen otsikko *
              <input
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
                placeholder={
                  f.type === "Ihminen"
                    ? "Esim. Kadonnut henkilö"
                    : f.type === "Eläin"
                      ? "Esim. Ruskea koira kateissa"
                      : f.type === "Menopeli"
                        ? "Esim. Musta polkupyörä kateissa"
                        : "Esim. Avaimet kadonneet"
                }
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
              Kuvaus ja tuntomerkit *
              <textarea
                required
                maxLength="600"
                value={f.desc}
                onChange={(e) => setF({ ...f, desc: e.target.value })}
                placeholder="Kerro milloin ja missä katoaminen tapahtui sekä kaikki tunnistamista helpottavat tiedot."
              />
              <small>{f.desc.length}/600 merkkiä</small>
            </label>
            <label className="full">
              Löytöpalkkio euroina
              <div className="inputicon">
                <Euro />
                <input
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  inputMode="numeric"
                  value={f.reward}
                  onChange={(e) => setF({ ...f, reward: e.target.value })}
                  placeholder="Esim. 50 (vapaaehtoinen)"
                />
              </div>
            </label>
          </div>
        </FormBlock>
        <FormBlock no="3" title="Sinun yhteystietosi">
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
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file)
                  setF({
                    ...f,
                    preview: URL.createObjectURL(file),
                    imageFile: file,
                  });
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
          <button className="primary" disabled={submitting}>
            {submitting ? "Julkaistaan…" : "Julkaise ilmoitus"} <ArrowRight />
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
    [passwordAgain, setPasswordAgain] = useState(""),
    [username, setUsername] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [confirmationSent, setConfirmationSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!supabaseConfigured) {
      setError("Tunnistautumispalvelua ei ole vielä yhdistetty sivustoon.");
      return;
    }
    if (register && password !== passwordAgain) {
      setError("Salasanat eivät täsmää.");
      return;
    }
    const cleanUsername = username.trim();
    const usernameError = register ? validateUsername(cleanUsername) : "";
    if (usernameError) {
      setError(usernameError);
      return;
    }
    setLoading(true);
    if (register) {
      const { data: existing, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", cleanUsername)
        .maybeSingle();
      if (profileError) {
        setLoading(false);
        setError("Käyttäjänimien tarkistus ei ole vielä käytössä. Suorita Supabasen schema.sql-tiedosto.");
        return;
      }
      if (existing) {
        setLoading(false);
        setError("Käyttäjänimi on jo käytössä. Valitse toinen käyttäjänimi.");
        return;
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username: cleanUsername },
          emailRedirectTo: window.location.origin,
        },
      });
      setLoading(false);
      if (authError) return setError(authError.message);
      if (!data.session) return setConfirmationSent(true);
      login(data.user);
    } else {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (authError) {
        setError(
          authError.message.toLowerCase().includes("email not confirmed")
            ? "Vahvista sähköpostiosoitteesi ennen kirjautumista."
            : "Sähköpostiosoite tai salasana on väärin.",
        );
        return;
      }
      login(data.user);
    }
  };
  if (confirmationSent) {
    return (
      <div className="modalback">
        <div className="modal confirmbox">
          <button type="button" className="close" onClick={close}><X /></button>
          <ShieldCheck />
          <h2>Vahvista sähköpostiosoitteesi</h2>
          <p>Lähetimme vahvistuslinkin osoitteeseen <b>{email}</b>. Avaa linkki ennen kirjautumista ja ilmoituksen tekemistä.</p>
          <button className="primary wide" onClick={() => { setConfirmationSent(false); setRegister(false); }}>Siirry kirjautumiseen</button>
        </div>
      </div>
    );
  }
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
        {register && (
          <label>
            Salasana uudelleen *
            <div className="inputicon">
              <Lock />
              <input
                required
                minLength="8"
                type="password"
                value={passwordAgain}
                onChange={(e) => setPasswordAgain(e.target.value)}
              />
            </div>
          </label>
        )}
        {error && <div className="autherror">{error}</div>}
        <button className="primary wide" disabled={loading}>
          {loading ? "Odota hetki…" : register ? "Luo käyttäjätili" : "Kirjaudu sisään"}
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

function NoticeDetail({ notice, close, user, requireLogin, addComment, message }) {
  const [commentText, setCommentText] = useState(""),
    [imageFile, setImageFile] = useState(null),
    [dmText, setDmText] = useState(""),
    [dm, setDm] = useState(false),
    [sending, setSending] = useState(false),
    [actionError, setActionError] = useState("");
  const comment = async () => {
    if (!user) return requireLogin();
    if (!commentText.trim() && !imageFile) return;
    setSending(true);
    setActionError("");
    try {
      await addComment(notice.id, commentText, imageFile);
      setCommentText("");
      setImageFile(null);
    } catch (error) {
      setActionError(`Kommenttia ei voitu lähettää: ${error.message}`);
    } finally {
      setSending(false);
    }
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
            <div className={`reward detailreward ${notice.reward ? "has-reward" : "no-reward"}`}>
              <span><Euro /> Löytöpalkkio</span>
              <b>{notice.reward ? `${Number(notice.reward).toLocaleString("fi-FI")} €` : "—"}</b>
            </div>
            <div className="contacts">
              <b>Ilmoittajan yhteystiedot</b>
              {notice.phone && (
                <a href={`tel:${notice.phone}`}>
                  <Phone /> {notice.phone}
                </a>
              )}
              <a href={`mailto:${notice.contactEmail}`}>
                <Mail /> {notice.contactEmail}
              </a>
            </div>
            {user?.id !== notice.owner && (
              <button
                className="primary"
                onClick={() => (user ? setDm(true) : requireLogin())}
              >
                <Send /> Lähetä yksityisviesti
              </button>
            )}
          </div>
        </div>
        {dm && (
          <div className="dm">
            <h3>Yksityisviesti käyttäjälle {notice.user}</h3>
            <textarea
              value={dmText}
              onChange={(e) => setDmText(e.target.value)}
              placeholder="Kirjoita viesti"
            />
            <button
              className="primary"
              disabled={sending || !dmText.trim()}
              onClick={async () => {
                setSending(true);
                setActionError("");
                try {
                  await message(notice.owner, notice.user, dmText);
                  setDm(false);
                  setDmText("");
                } catch (error) {
                  setActionError(`Viestiä ei voitu lähettää: ${error.message}`);
                } finally {
                  setSending(false);
                }
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
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Kirjoita havainto tai kommentti"
            disabled={dm}
          />
          <div className="commentactions">
            <label>
              <ImagePlus /> Lisää kuva
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) setImageFile(f);
                }}
              />
            </label>
            {imageFile && <span>Kuva valittu</span>}
            <button className="primary" onClick={comment} disabled={sending}>
              <Send /> Lähetä
            </button>
          </div>
          {actionError && <div className="autherror">{actionError}</div>}
        </div>
      </div>
    </div>
  );
}

function Mine({ data, open, remove, markFound, protectedGo }) {
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
            <Card
              key={n.id}
              n={n}
              open={() => open(n)}
              remove={remove}
              markFound={markFound}
            />
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
              <b>{m.incoming ? `Lähettäjä: ${m.from}` : `Vastaanottaja: ${m.to}`}</b>
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

function AccountSettings({ user, updateUser, notify, logout }) {
  const [username, setUsername] = useState(user?.username || ""),
    [oldPassword, setOldPassword] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    [confirmPassword, setConfirmPassword] = useState(""),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);

  const saveUsername = async (e) => {
    e.preventDefault();
    setError("");
    const cleanUsername = username.trim();
    const usernameError = validateUsername(cleanUsername);
    if (usernameError) return setError(usernameError);
    setSaving(true);
    const { data: existing, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", cleanUsername)
      .neq("id", user.id)
      .maybeSingle();
    if (checkError || existing) {
      setSaving(false);
      return setError(
        existing
          ? "Käyttäjänimi on jo käytössä. Valitse toinen käyttäjänimi."
          : "Käyttäjänimeä ei voitu tarkistaa.",
      );
    }
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ username: cleanUsername })
      .eq("id", user.id);
    if (profileUpdateError) {
      setSaving(false);
      return setError(
        profileUpdateError.code === "23505"
          ? "Käyttäjänimi on jo käytössä. Valitse toinen käyttäjänimi."
          : "Käyttäjänimeä ei voitu päivittää.",
      );
    }
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { username: cleanUsername },
    });
    setSaving(false);
    if (updateError) return setError(updateError.message);
    updateUser(accountFromUser(data.user));
    notify("Käyttäjänimi päivitettiin");
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8)
      return setError("Uudessa salasanassa pitää olla vähintään 8 merkkiä.");
    if (newPassword !== confirmPassword)
      return setError("Uudet salasanat eivät täsmää.");
    setSaving(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });
    if (loginError) {
      setSaving(false);
      return setError("Vanha salasana on väärin.");
    }
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving(false);
    if (passwordError) return setError(passwordError.message);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    notify("Salasana vaihdettiin");
  };

  return (
    <section className="page narrow accountpage">
      <div className="pagehead">
        <span className="kicker">KÄYTTÄJÄTILI</span>
        <h1>Asetukset</h1>
        <p>Hallinnoi käyttäjätilisi tietoja ja salasanaa.</p>
      </div>
      <div className="accountgrid">
        <div className="accountcard">
          <h2>Tilitiedot</h2>
          <div className="accountrow"><span>Sähköpostiosoite</span><b>{user.email}</b></div>
          <div className="accountrow"><span>Sähköpostin vahvistus</span><b className="verified"><CheckCircle2 /> Vahvistettu</b></div>
          <form onSubmit={saveUsername}>
            <label>Käyttäjänimi<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <button className="secondary" disabled={saving}>Tallenna käyttäjänimi</button>
          </form>
        </div>
        <div className="accountcard">
          <h2>Vaihda salasana</h2>
          <p className="muted">Nykyistä salasanaa ei voida näyttää turvallisuussyistä.</p>
          <form onSubmit={changePassword}>
            <label>Vanha salasana<input required type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} /></label>
            <label>Uusi salasana<input required minLength="8" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
            <label>Uusi salasana uudelleen<input required minLength="8" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></label>
            <button className="primary" disabled={saving}>Vaihda salasana</button>
          </form>
        </div>
      </div>
      {error && <div className="autherror settings-error">{error}</div>}
      <button className="logoutbtn" onClick={logout}><LogOut /> Kirjaudu ulos</button>
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
function Footer({ go, protectedGo }) {
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
          Paikallinen palvelu kadonneiden ihmisten, eläinten, menopelien ja
          tavaroiden löytämiseksi.
        </p>
      </div>
      <div>
        <b>Palvelu</b>
        <button onClick={() => go("home")}>Etusivu</button>
        <button onClick={() => go("notices")}>Ilmoitukset</button>
        <button onClick={() => protectedGo("new")}>Tee ilmoitus</button>
        <button onClick={() => go("info")}>Ohjeet</button>
      </div>
      <div>
        <b>Käyttäjätili</b>
        <button onClick={() => protectedGo("mine")}>Omat ilmoitukset</button>
        <button onClick={() => protectedGo("messages")}>Viestit</button>
        <button onClick={() => protectedGo("settings")}>Asetukset</button>
      </div>
      <div className="footer-help">
        <b>Hätätilanteessa</b>
        <p>Soita hätänumeroon</p>
        <strong>112</strong>
      </div>
      <small>© 2026 Kadonneet Oulu · Päivitetty 13.7.2026</small>
    </footer>
  );
}
createRoot(document.getElementById("root")).render(<App />);
