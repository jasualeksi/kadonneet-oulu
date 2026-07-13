import React, { useEffect, useMemo, useRef, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
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
  CircleHelp,
  ClipboardList,
  UserPlus,
  ArrowLeft,
  Pencil,
  Share2,
  Flag,
  Bookmark,
  BookmarkCheck,
  RotateCcw,
} from "lucide-react";
import "./styles.css";
import { accountFromUser, supabase, supabaseConfigured } from "./supabase";
import { validateUsername } from "./usernameModeration";
import {
  createComment,
  createMessage,
  createNotice,
  updateNotice,
  fetchMessages,
  fetchNotices,
  removeNotice,
  setNoticeFound,
  reactivateNotice,
  fetchSavedNoticeIds,
  saveNotice,
  unsaveNotice,
  createReport,
  checkAdminRole,
  fetchReports,
  setReportStatus,
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

const VIEW_PATHS = {
  home: "/",
  notices: "/ilmoitukset",
  new: "/tee-ilmoitus",
  mine: "/omat-ilmoitukset",
  messages: "/viestit",
  settings: "/asetukset",
  saved: "/tallennetut",
  admin: "/yllapito",
  info: "/ohjeet",
};

const REPORT_REASONS = {
  spam: "Roskaposti tai huijaus",
  harassment: "Loukkaava, uhkaava tai vihamielinen sisältö",
  false_information: "Virheelliset tai harhaanjohtavat tiedot",
  privacy: "Yksityisyys tai henkilötiedot",
  inappropriate_image: "Sopimaton kuva",
  other: "Muu syy",
};

function routeFromPath(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const noticeMatch = path.match(/^\/ilmoitukset\/([0-9a-f-]+)$/i);
  if (noticeMatch) return { view: "notices", noticeId: noticeMatch[1] };
  const profileMatch = path.match(/^\/kayttajat\/([0-9a-f-]+)$/i);
  if (profileMatch) return { view: "profile", profileId: profileMatch[1] };
  const editMatch = path.match(/^\/omat-ilmoitukset\/([0-9a-f-]+)\/muokkaa$/i);
  if (editMatch) return { view: "edit", editId: editMatch[1] };
  const view = Object.entries(VIEW_PATHS).find(([, route]) => route === path)?.[0];
  return { view: view || "home" };
}

function App() {
  const [data, setData] = useState([]),
    [user, setUser] = useState(null),
    [view, setView] = useState("home"),
    [login, setLogin] = useState(false),
    [pending, setPending] = useState(null),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [messages, setMessages] = useState([]),
    [active, setActive] = useState(null),
    [editingNotice, setEditingNotice] = useState(null),
    [publicProfile, setPublicProfile] = useState(null),
    [savedIds, setSavedIds] = useState([]),
    [isAdmin, setIsAdmin] = useState(false),
    [reportTarget, setReportTarget] = useState(null);
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
    let current = true;
    const loadMessages = (showError = false) => {
      fetchMessages(user.id)
        .then((loaded) => {
          if (current) setMessages(loaded);
        })
        .catch(() => {
          if (showError) notify("Viestejä ei voitu ladata");
        });
    };
    loadMessages(true);
    const refresh = setInterval(() => loadMessages(false), 7000);
    return () => {
      current = false;
      clearInterval(refresh);
    };
  }, [user?.id]);
  useEffect(() => {
    if (!user?.id) {
      setSavedIds([]);
      setIsAdmin(false);
      return;
    }
    fetchSavedNoticeIds(user.id).then(setSavedIds).catch(() => setSavedIds([]));
    checkAdminRole(user.id).then(setIsAdmin).catch(() => setIsAdmin(false));
  }, [user?.id]);
  const go = (v, customPath = VIEW_PATHS[v] || "/", replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", customPath);
    setView(v);
    setActive(null);
    setMenu(false);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const openNotice = (notice) => {
    window.history.pushState(
      { noticeOverlay: true },
      "",
      `/ilmoitukset/${notice.id}`,
    );
    setActive(notice);
  };
  const closeNotice = () => {
    setActive(null);
    if (window.history.state?.noticeOverlay) window.history.back();
    else go("notices", VIEW_PATHS.notices, true);
  };

  useEffect(() => {
    const applyCurrentRoute = () => {
      const route = routeFromPath(window.location.pathname);
      setView(route.view);
      setMenu(false);
      if (route.noticeId) {
        setActive(data.find((notice) => notice.id === route.noticeId) || null);
      } else {
        setActive(null);
      }
      if (route.profileId) {
        setPublicProfile((current) =>
          current?.id === route.profileId
            ? current
            : { id: route.profileId, username: "Käyttäjä" },
        );
      }
      if (route.editId) {
        setEditingNotice(
          data.find((notice) => notice.id === route.editId) || null,
        );
      }
      window.scrollTo({ top: 0 });
    };
    applyCurrentRoute();
    window.addEventListener("popstate", applyCurrentRoute);
    return () => window.removeEventListener("popstate", applyCurrentRoute);
  }, [data]);
  useEffect(() => {
    const titles = {
      home: "Kadonneet Oulu",
      notices: "Ilmoitukset – Kadonneet Oulu",
      new: "Tee ilmoitus – Kadonneet Oulu",
      edit: "Muokkaa ilmoitusta – Kadonneet Oulu",
      mine: "Omat ilmoitukset – Kadonneet Oulu",
      messages: "Viestit – Kadonneet Oulu",
      settings: "Asetukset – Kadonneet Oulu",
      saved: "Tallennetut ilmoitukset – Kadonneet Oulu",
      admin: "Ylläpito – Kadonneet Oulu",
      profile: "Käyttäjäprofiili – Kadonneet Oulu",
      info: "Ohjeet – Kadonneet Oulu",
    };
    document.title = active?.name
      ? `${active.name} – Kadonneet Oulu`
      : titles[view] || "Kadonneet Oulu";
  }, [view, active?.name]);
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
  const saveNoticeChanges = async (form) => {
    try {
      const updated = await updateNotice(editingNotice.id, form, user.id);
      setData((current) =>
        current.map((notice) => (notice.id === updated.id ? updated : notice)),
      );
      setEditingNotice(null);
      notify("Ilmoituksen muutokset tallennettiin");
      go("mine");
    } catch (error) {
      notify(`Muutoksia ei voitu tallentaa: ${error.message}`);
      throw error;
    }
  };
  const editNotice = (notice) => {
    setEditingNotice(notice);
    go("edit", `/omat-ilmoitukset/${notice.id}/muokkaa`);
  };
  const remove = async (id) => {
    try {
      await removeNotice(id);
      setData((current) => current.filter((n) => n.id !== id));
      notify("Ilmoitus poistettiin");
      return true;
    } catch {
      notify("Ilmoitusta ei voitu poistaa");
      return false;
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
  const reopenNotice = async (id) => {
    try {
      const updated = await reactivateNotice(id);
      setData((current) => current.map((n) => (n.id === id ? updated : n)));
      setActive((current) => (current?.id === id ? updated : current));
      notify("Ilmoitus aktivoitiin uudelleen");
    } catch {
      notify("Ilmoitusta ei voitu aktivoida uudelleen");
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
  const sendPrivateMessage = async (recipientId, recipientName, text, file = null) => {
    const sent = await createMessage(recipientId, recipientName, text, user, file);
    setMessages((current) => [sent, ...current]);
    notify("Yksityisviesti lähetettiin");
  };
  const logout = async () => {
    await supabase?.auth.signOut();
    setUser(null);
    go("home");
    notify("Kirjauduit ulos");
  };
  const openProfile = (id, username) => {
    setActive(null);
    setPublicProfile({ id, username });
    go("profile", `/kayttajat/${id}`);
  };
  const toggleSavedNotice = async (notice) => {
    if (!user) {
      setLogin("login");
      return;
    }
    const isSaved = savedIds.includes(notice.id);
    try {
      if (isSaved) {
        await unsaveNotice(user.id, notice.id);
        setSavedIds((current) => current.filter((id) => id !== notice.id));
        notify("Ilmoitus poistettiin tallennetuista");
      } else {
        await saveNotice(user.id, notice.id);
        setSavedIds((current) => [...current, notice.id]);
        notify("Ilmoitus tallennettiin");
      }
    } catch {
      notify("Tallennusta ei voitu päivittää");
    }
  };
  const startReport = (notice) => {
    setReportTarget(notice);
    if (!user) setLogin("login");
  };
  return (
    <div className="app">
      <Header
        user={user}
        view={view}
        go={go}
        protectedGo={protectedGo}
        setLogin={setLogin}
        logout={logout}
        isAdmin={isAdmin}
        menu={menu}
        setMenu={setMenu}
      />
      <main>
        {view === "home" && (
          <HomePage go={go} protectedGo={protectedGo} data={data} open={openNotice} report={startReport} savedIds={savedIds} toggleSaved={toggleSavedNotice} />
        )}
        {view === "notices" && <Notices data={data} open={openNotice} report={startReport} savedIds={savedIds} toggleSaved={toggleSavedNotice} />}
        {view === "new" && <NewNotice onSubmit={add} />}
        {view === "edit" && editingNotice && (
          <NewNotice
            onSubmit={saveNoticeChanges}
            initialNotice={editingNotice}
            editing
            onCancel={() => {
              setEditingNotice(null);
              go("mine");
            }}
          />
        )}
        {view === "mine" && (
          <Mine
            data={data.filter((n) => n.owner === user?.id)}
            open={openNotice}
            remove={remove}
            markFound={markFound}
            reopenNotice={reopenNotice}
            edit={editNotice}
            report={startReport}
            savedIds={savedIds}
            toggleSaved={toggleSavedNotice}
            protectedGo={protectedGo}
          />
        )}
        {view === "messages" && (
          <Messages messages={messages} send={sendPrivateMessage} />
        )}
        {view === "settings" && (
          <AccountSettings
            user={user}
            updateUser={setUser}
            notify={notify}
            logout={logout}
          />
        )}
        {view === "saved" && (
          <SavedNotices
            notices={data.filter((notice) => savedIds.includes(notice.id))}
            open={openNotice}
            report={startReport}
            savedIds={savedIds}
            toggleSaved={toggleSavedNotice}
          />
        )}
        {view === "admin" && isAdmin && (
          <AdminPanel notify={notify} removeNotice={remove} />
        )}
        {view === "profile" && publicProfile && (
          <PublicProfile
            selected={publicProfile}
            notices={data.filter((notice) => notice.owner === publicProfile.id)}
            openNotice={openNotice}
            report={startReport}
            savedIds={savedIds}
            toggleSaved={toggleSavedNotice}
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
            setReportTarget(null);
          }}
          login={auth}
        />
      )}
      {active && (
        <NoticeDetail
          notice={active}
          close={closeNotice}
          user={user}
          requireLogin={() => {
            setActive(null);
            setPending("notices");
            setLogin(true);
          }}
          addComment={addNoticeComment}
          message={sendPrivateMessage}
          openProfile={openProfile}
          report={() => startReport(active)}
          saved={savedIds.includes(active.id)}
          toggleSaved={() => toggleSavedNotice(active)}
        />
      )}
      {reportTarget && user && (
        <ReportModal
          notice={reportTarget}
          close={() => setReportTarget(null)}
          submit={async (reason, details) => {
            await createReport(reportTarget, reason, details, user.id);
            setReportTarget(null);
            notify("Ilmoitus lähetettiin ylläpidolle");
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

function Header({ user, view, go, protectedGo, setLogin, logout, isAdmin, menu, setMenu }) {
  const [accountMenu, setAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    if (!accountMenu) return;
    const closeOutside = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenu(false);
    };
    const closeWithEscape = (event) => {
      if (event.key === "Escape") setAccountMenu(false);
    };
    const closeWhenPageLosesFocus = () => setAccountMenu(false);
    document.addEventListener("click", closeOutside, true);
    document.addEventListener("keydown", closeWithEscape);
    window.addEventListener("blur", closeWhenPageLosesFocus);
    return () => {
      document.removeEventListener("click", closeOutside, true);
      document.removeEventListener("keydown", closeWithEscape);
      window.removeEventListener("blur", closeWhenPageLosesFocus);
    };
  }, [accountMenu]);

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
        <button onClick={() => go("notices")}><LayoutList /> Ilmoitukset</button>
        <button onClick={() => go("info")}><CircleHelp /> Ohjeet</button>
        {user && (
          <>
            <button onClick={() => go("mine")}><ClipboardList /> Omat ilmoitukset</button>
            <button onClick={() => go("messages")}><MessageCircle /> Viestit</button>
            <button onClick={() => go("saved")}><Bookmark /> Tallennetut</button>
            {isAdmin && <button onClick={() => go("admin")}><ShieldCheck /> Ylläpito</button>}
            <button className="mobile-account" onClick={() => go("settings")}>
              <Settings /> Asetukset
            </button>
            <button className="mobile-account mobile-logout" onClick={logout}>
              <LogOut /> Kirjaudu ulos
            </button>
          </>
        )}
        {!user && (
          <>
            <button className="mobile-login" onClick={() => setLogin("login")}>
              <UserRound /> Kirjaudu
            </button>
            <button
              className="mobile-login"
              onClick={() => setLogin("register")}
            >
              <UserPlus /> Rekisteröidy
            </button>
          </>
        )}
      </nav>
      <div className="header-actions">
        {user ? (
          <div className="account-menu-wrap" ref={accountMenuRef}>
            <button className="login usertrigger" onClick={() => setAccountMenu(!accountMenu)}>
              <UserRound size={18} />
              {user.username}
              <ChevronDown size={16} />
            </button>
            {accountMenu && (
              <div className="account-dropdown">
                <button onClick={() => { setAccountMenu(false); go("mine"); }}><ClipboardList /> Omat ilmoitukset</button>
                <button onClick={() => { setAccountMenu(false); go("saved"); }}><Bookmark /> Tallennetut</button>
                {isAdmin && <button onClick={() => { setAccountMenu(false); go("admin"); }}><ShieldCheck /> Ylläpito</button>}
                <button onClick={() => { setAccountMenu(false); go("settings"); }}><Settings /> Asetukset</button>
                <button className="logout-option" onClick={() => { setAccountMenu(false); logout(); }}><LogOut /> Kirjaudu ulos</button>
              </div>
            )}
          </div>
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
              <UserPlus /> Rekisteröidy
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

function HomePage({ go, protectedGo, data, open, report, savedIds, toggleSaved }) {
  const count = data.length;
  const rotatingNotices = useMemo(
    () => [...data].sort((a, b) => b.created - a.created).slice(0, 8),
    [data],
  );
  const [slide, setSlide] = useState(0),
    [carouselPaused, setCarouselPaused] = useState(false),
    [touchStart, setTouchStart] = useState(null);
  useEffect(() => {
    if (rotatingNotices.length < 2 || carouselPaused) return;
    const timer = setInterval(
      () => setSlide((current) => (current + 1) % rotatingNotices.length),
      5500,
    );
    return () => clearInterval(timer);
  }, [rotatingNotices.length, carouselPaused]);
  useEffect(() => {
    if (slide >= rotatingNotices.length) setSlide(0);
  }, [rotatingNotices.length, slide]);
  const changeSlide = (direction) => {
    if (rotatingNotices.length < 2) return;
    setSlide(
      (current) =>
        (current + direction + rotatingNotices.length) % rotatingNotices.length,
    );
  };
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
            Ilmoita kadonneesta ihmisestä, eläimestä, ajoneuvosta tai tavarasta
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
      {count ? (
        <section className="latest homenotices">
          <div className="homecarouselhead">
            <div>
              <span className="kicker">KADONNEET OULUN ALUEELLA</span>
              <h2>Uusimmat ilmoitukset</h2>
              <p>Selaa uusimpia ilmoituksia tai avaa ilmoitus nähdäksesi lisätiedot.</p>
            </div>
            <button className="text-button" onClick={() => go("notices")}>
              Näytä kaikki <ArrowRight />
            </button>
          </div>
          <div
            className="homecarousel"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
            onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
            onTouchEnd={(event) => {
              if (touchStart === null) return;
              const distance = event.changedTouches[0].clientX - touchStart;
              if (Math.abs(distance) > 45) changeSlide(distance < 0 ? 1 : -1);
              setTouchStart(null);
            }}
          >
            <button
              className="carouselarrow previous"
              onClick={() => changeSlide(-1)}
              aria-label="Edellinen ilmoitus"
              disabled={rotatingNotices.length < 2}
            >
              <ChevronLeft />
            </button>
            <div className="carouselstage" key={rotatingNotices[slide]?.id}>
              <Card n={rotatingNotices[slide]} open={() => open(rotatingNotices[slide])} report={report} saved={savedIds.includes(rotatingNotices[slide].id)} toggleSaved={toggleSaved} />
            </div>
            <button
              className="carouselarrow next"
              onClick={() => changeSlide(1)}
              aria-label="Seuraava ilmoitus"
              disabled={rotatingNotices.length < 2}
            >
              <ChevronRight />
            </button>
          </div>
          {rotatingNotices.length > 1 && (
            <div className="carouseldots" aria-label="Valitse ilmoitus">
              {rotatingNotices.map((notice, index) => (
                <button
                  key={notice.id}
                  className={index === slide ? "active" : ""}
                  onClick={() => setSlide(index)}
                  aria-label={`Ilmoitus ${index + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="latest emptyhome">
          <span className="kicker">ILMOITUKSET</span>
          <h2>Ei julkaistuja ilmoituksia</h2>
          <p>Ilmoituksia ei ole vielä julkaistu.</p>
          <button className="secondary" onClick={() => go("notices")}>
            Avaa ilmoitukset <ArrowRight />
          </button>
        </section>
      )}
    </>
  );
}

function Notices({ data, open, report, savedIds, toggleSaved }) {
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
          {["Kaikki", "Eläin", "Ihminen", "Ajoneuvo", "Tavara"].map((c) => (
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
            <Card n={n} key={n.id} open={() => open(n)} report={report} saved={savedIds.includes(n.id)} toggleSaved={toggleSaved} />
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
  if (type === "Ajoneuvo") return <Bike />;
  if (type === "Tavara") return <Package />;
  return <UserRound />;
}

function Card({ n, open, remove, markFound, reopenNotice, edit, report, saved, toggleSaved }) {
  const [shared, setShared] = useState(false);
  const shareCard = async () => {
    const url = `${window.location.origin}/ilmoitukset/${n.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: n.name, text: `${n.name} – ${n.area}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      // Jakovalikon peruuttaminen ei vaadi virheilmoitusta.
    }
  };
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
        <div className="cardtools">
          <button
            className={saved ? "saved" : ""}
            type="button"
            aria-label={saved ? "Poista tallennetuista" : "Tallenna ilmoitus"}
            title={saved ? "Poista tallennetuista" : "Tallenna ilmoitus"}
            onClick={(event) => {
              event.stopPropagation();
              toggleSaved?.(n);
            }}
          >
            {saved ? <BookmarkCheck /> : <Bookmark />}
          </button>
          <button
            className="sharetool"
            type="button"
            aria-label={shared ? "Linkki kopioitu" : "Jaa ilmoitus"}
            title={shared ? "Linkki kopioitu" : "Jaa ilmoitus"}
            onClick={(event) => {
              event.stopPropagation();
              shareCard();
            }}
          >
            {shared ? <CheckCircle2 /> : <Share2 />}
          </button>
          <button
            className="reporttool"
            type="button"
            aria-label="Ilmoita asiaton sisältö"
            title="Ilmoita asiaton sisältö"
            onClick={(event) => {
              event.stopPropagation();
              report?.(n);
            }}
          >
            <Flag />
          </button>
        </div>
        {markFound && !n.found && (
          <button
            className="foundbtn"
            onClick={(e) => {
              e.stopPropagation();
              const confirmed = window.confirm(
                "Oletko varma, että haluat merkitä tämän löytyneeksi? Ilmoitus poistetaan automaattisesti viiden vuorokauden kuluttua. Voit aktivoida sen uudelleen ennen poistamista.",
              );
              if (!confirmed) return;
              markFound(n.id);
            }}
          >
            <CheckCircle2 /> Merkitse löytyneeksi
          </button>
        )}
        {reopenNotice && n.found && (
          <button
            className="foundbtn reactivatebtn"
            onClick={(e) => {
              e.stopPropagation();
              const confirmed = window.confirm(
                "Aktivoidaanko tämä ilmoitus uudelleen? Se palautuu avoimeksi alkuperäisellä julkaisuajallaan.",
              );
              if (!confirmed) return;
              reopenNotice(n.id);
            }}
          >
            <RotateCcw /> Aktivoi uudelleen
          </button>
        )}
        {edit && (
          <button
            className="editbtn"
            onClick={(e) => {
              e.stopPropagation();
              edit(n);
            }}
          >
            <Pencil /> Muokkaa ilmoitusta
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

function NewNotice({ onSubmit, initialNotice = null, editing = false, onCancel }) {
  const [f, setF] = useState(() => ({
    type: initialNotice?.type || "Eläin",
    name: initialNotice?.name || "",
    area: initialNotice?.area || "",
    desc: initialNotice?.desc || "",
    phone: initialNotice?.phone || "",
    contactEmail: initialNotice?.contactEmail || "",
    reward: initialNotice?.reward || "",
    preview: initialNotice?.preview || "",
    imageFile: null,
  }));
  const [submitting, setSubmitting] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(f);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="page narrow">
      <div className="pagehead">
        <span className="kicker">{editing ? "MUOKKAA ILMOITUSTA" : "UUSI ILMOITUS"}</span>
        <h1>{editing ? "Muokkaa ilmoitusta" : "Ilmoita kadonneesta"}</h1>
        <p>
          {editing
            ? "Tarkista muutokset ennen tallentamista. Alkuperäinen julkaisuaika säilyy ennallaan."
            : "Täytä tiedot huolellisesti. Yhteystietoja käytetään havaintojen ilmoittamiseen."}
        </p>
      </div>
      <form className="noticeform" onSubmit={submit}>
        <FormBlock no="1" title="Mitä ilmoitus koskee?">
          <div className="typechoice">
            {["Eläin", "Ihminen", "Ajoneuvo", "Tavara"].map((t) => (
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
                    Ajoneuvo: "Pyörä, mopo tai muu ajoneuvo",
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
                      : f.type === "Ajoneuvo"
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
          {editing && (
            <button type="button" className="secondary" onClick={onCancel}>
              Peruuta
            </button>
          )}
          <button className="primary" disabled={submitting}>
            {submitting
              ? editing
                ? "Tallennetaan…"
                : "Julkaistaan…"
              : editing
                ? "Tallenna muutokset"
                : "Julkaise ilmoitus"} <ArrowRight />
          </button>
        </div>
        <p className="expiry">
          <Clock3 /> {editing
            ? "Muokkaaminen ei muuta julkaisuaikaa tai voimassaolon päättymistä."
            : "Ilmoitus poistuu automaattisesti 14 vuorokauden kuluttua."}
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

function relativeCommentTime(created, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - created) / 60000));
  if (minutes < 1) return "juuri nyt";
  if (minutes < 60) return `${minutes} min sitten`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h sitten`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "päivä" : "päivää"} sitten`;
}

function NoticeDetail({ notice, close, user, requireLogin, addComment, message, openProfile, report, saved, toggleSaved }) {
  const [commentText, setCommentText] = useState(""),
    [imageFile, setImageFile] = useState(null),
    [dmText, setDmText] = useState(""),
    [dmImageFile, setDmImageFile] = useState(null),
    [shared, setShared] = useState(false),
    [dm, setDm] = useState(false),
    [sending, setSending] = useState(false),
    [now, setNow] = useState(Date.now()),
    [actionError, setActionError] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
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
  const shareNotice = async () => {
    const url = `${window.location.origin}/ilmoitukset/${notice.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: notice.name,
          text: `${notice.name} – ${notice.area}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    } catch {
      // Jakovalikon peruuttaminen ei vaadi virheilmoitusta.
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
            <div className="detailtools">
              <button className={`secondary ${saved ? "saved" : ""}`} onClick={toggleSaved}>
                {saved ? <BookmarkCheck /> : <Bookmark />} {saved ? "Tallennettu" : "Tallenna"}
              </button>
              <button className="secondary sharebtn" onClick={shareNotice}>
                <Share2 /> {shared ? "Linkki kopioitu" : "Jaa ilmoitus"}
              </button>
              <button className="secondary reportbtn" onClick={report}>
                <Flag /> Ilmoita asiaton sisältö
              </button>
            </div>
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
            <div className="dm-actions">
              <label className="imagepick">
                <ImagePlus /> {dmImageFile ? dmImageFile.name : "Lisää kuva"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setDmImageFile(event.target.files[0] || null)}
                />
              </label>
              <button
                className="primary"
                disabled={sending || (!dmText.trim() && !dmImageFile)}
                onClick={async () => {
                  setSending(true);
                  setActionError("");
                  try {
                    await message(notice.owner, notice.user, dmText, dmImageFile);
                    setDm(false);
                    setDmText("");
                    setDmImageFile(null);
                  } catch (error) {
                    setActionError(`Viestiä ei voitu lähettää: ${error.message}`);
                  } finally {
                    setSending(false);
                  }
                }}
              >
                <Send /> Lähetä
              </button>
            </div>
          </div>
        )}
        <div className="comments">
          <h3>
            <MessageCircle /> Havainnot ja kommentit
          </h3>
          {notice.comments?.map((c) => (
            <div className="comment" key={c.id}>
              <div className="commenthead">
                <button onClick={() => openProfile(c.userId, c.user)}>
                  <span>{c.user?.[0]}</span>
                  <b>{c.user}</b>
                </button>
                <time title={new Date(c.created).toLocaleString("fi-FI")}>
                  {relativeCommentTime(c.created, now)}
                </time>
              </div>
              {c.text && <p>{c.text}</p>}
              {c.image && <img src={c.image} alt="Kommenttiin lisätty kuva" />}
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

function PublicProfile({ selected, notices, openNotice, report, savedIds, toggleSaved }) {
  const [profile, setProfile] = useState(selected);

  useEffect(() => {
    let current = true;
    setProfile(selected);
    supabase
      ?.from("profiles")
      .select("id, username, created_at")
      .eq("id", selected.id)
      .maybeSingle()
      .then(({ data }) => {
        if (current && data) setProfile(data);
      });
    return () => {
      current = false;
    };
  }, [selected]);

  return (
    <section className="page publicprofile">
      <div className="profilehero">
        <span className="profileavatar">{profile.username?.[0]?.toUpperCase()}</span>
        <div>
          <span className="kicker">KÄYTTÄJÄPROFIILI</span>
          <h1>{profile.username}</h1>
          {profile.created_at && (
            <p>Liittynyt {new Date(profile.created_at).toLocaleDateString("fi-FI")}</p>
          )}
        </div>
      </div>
      <div className="section-title profiletitle">
        <div>
          <h2>Käyttäjän ilmoitukset</h2>
          <p>{notices.length} voimassa olevaa ilmoitusta</p>
        </div>
      </div>
      {notices.length ? (
        <div className="cards listing">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              n={notice}
              open={() => openNotice(notice)}
              report={report}
              saved={savedIds.includes(notice.id)}
              toggleSaved={toggleSaved}
            />
          ))}
        </div>
      ) : (
        <div className="empty profileempty">
          <LayoutList />
          <h3>Ei voimassa olevia ilmoituksia</h3>
          <p>Tällä käyttäjällä ei ole tällä hetkellä julkisia ilmoituksia.</p>
        </div>
      )}
    </section>
  );
}

function Mine({ data, open, remove, markFound, reopenNotice, edit, report, savedIds, toggleSaved, protectedGo }) {
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
              reopenNotice={reopenNotice}
              edit={edit}
              report={report}
              saved={savedIds.includes(n.id)}
              toggleSaved={toggleSaved}
            />
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}
function Messages({ messages, send }) {
  const [selectedId, setSelectedId] = useState(null),
    [draft, setDraft] = useState(""),
    [messageImage, setMessageImage] = useState(null),
    [sending, setSending] = useState(false),
    [error, setError] = useState(""),
    [now, setNow] = useState(Date.now());
  const messagesEnd = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const conversations = useMemo(() => {
    const grouped = new Map();
    messages.forEach((message) => {
      if (!grouped.has(message.partnerId)) {
        grouped.set(message.partnerId, {
          id: message.partnerId,
          name: message.partnerName,
          messages: [],
        });
      }
      grouped.get(message.partnerId).messages.push(message);
    });
    return [...grouped.values()]
      .map((conversation) => ({
        ...conversation,
        messages: conversation.messages.sort((a, b) => a.created - b.created),
      }))
      .sort(
        (a, b) =>
          b.messages[b.messages.length - 1].created -
          a.messages[a.messages.length - 1].created,
      );
  }, [messages]);

  const selected = conversations.find((conversation) => conversation.id === selectedId);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, selected?.messages.length]);

  const reply = async (event) => {
    event.preventDefault();
    if (!selected || (!draft.trim() && !messageImage) || sending) return;
    setSending(true);
    setError("");
    try {
      await send(selected.id, selected.name, draft, messageImage);
      setDraft("");
      setMessageImage(null);
    } catch (sendError) {
      setError(`Viestiä ei voitu lähettää: ${sendError.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="page messagespage">
      <div className="pagehead">
        <span className="kicker">YKSITYISVIESTIT</span>
        <h1>Viestit</h1>
        <p>Keskustele yksityisesti ilmoituksiin liittyvistä havainnoista.</p>
      </div>
      {messages.length ? (
        <div className={`chatlayout ${selected ? "conversation-open" : ""}`}>
          <aside className="conversationlist">
            <h2>Keskustelut</h2>
            {conversations.map((conversation) => {
              const latest = conversation.messages[conversation.messages.length - 1];
              return (
                <button
                  key={conversation.id}
                  className={selectedId === conversation.id ? "active" : ""}
                  onClick={() => {
                    setSelectedId(conversation.id);
                    setError("");
                  }}
                >
                  <span className="chatavatar">{conversation.name?.[0]}</span>
                  <span className="conversationpreview">
                    <strong>{conversation.name}</strong>
                    <span>{latest.incoming ? "" : "Sinä: "}{latest.text || "Kuva"}</span>
                  </span>
                  <time>{relativeCommentTime(latest.created, now)}</time>
                </button>
              );
            })}
          </aside>
          <div className="chatpanel">
            {selected ? (
              <>
                <div className="chatheader">
                  <button className="chatback" onClick={() => setSelectedId(null)}>
                    <ArrowLeft /> <span>Takaisin</span>
                  </button>
                  <span className="chatavatar">{selected.name?.[0]}</span>
                  <strong>{selected.name}</strong>
                </div>
                <div className="chatmessages">
                  {selected.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`chatbubble ${message.incoming ? "incoming" : "outgoing"}`}
                    >
                      {message.text && <p>{message.text}</p>}
                      {message.image && (
                        <img src={message.image} alt="Yksityisviestiin lisätty kuva" />
                      )}
                      <time title={new Date(message.created).toLocaleString("fi-FI")}>
                        {relativeCommentTime(message.created, now)}
                      </time>
                    </div>
                  ))}
                  <div ref={messagesEnd} />
                </div>
                <form className="chatcomposer" onSubmit={reply}>
                  <label className="chatimagepick" title="Lisää kuva">
                    <ImagePlus />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setMessageImage(event.target.files[0] || null)}
                    />
                  </label>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Kirjoita viesti"
                    maxLength={2000}
                  />
                  <button
                    className="primary"
                    disabled={sending || (!draft.trim() && !messageImage)}
                  >
                    <Send /> Lähetä
                  </button>
                  {messageImage && (
                    <div className="selectedchatimage">
                      <ImagePlus /> <span>{messageImage.name}</span>
                      <button type="button" onClick={() => setMessageImage(null)} aria-label="Poista valittu kuva">
                        <X />
                      </button>
                    </div>
                  )}
                </form>
                {error && <div className="autherror chaterror">{error}</div>}
              </>
            ) : (
              <div className="chatplaceholder">
                <MessageCircle />
                <h2>Valitse keskustelu</h2>
                <p>Avaa keskustelu vasemmalla olevasta listasta.</p>
              </div>
            )}
          </div>
        </div>
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

function SavedNotices({ notices, open, report, savedIds, toggleSaved }) {
  return (
    <section className="page">
      <div className="pagehead">
        <span className="kicker">OMA KOKOELMA</span>
        <h1>Tallennetut ilmoitukset</h1>
        <p>Tallennukset näkyvät vain sinulle. Voit poistaa tallennuksen milloin tahansa.</p>
      </div>
      {notices.length ? (
        <div className="cards listing">
          {notices.map((notice) => (
            <Card
              key={notice.id}
              n={notice}
              open={() => open(notice)}
              report={report}
              saved={savedIds.includes(notice.id)}
              toggleSaved={toggleSaved}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <Bookmark />
          <h3>Ei tallennettuja ilmoituksia</h3>
          <p>Tallentamasi ilmoitukset löytyvät myöhemmin helposti tältä sivulta.</p>
        </div>
      )}
    </section>
  );
}

function ReportModal({ notice, close, submit }) {
  const [reason, setReason] = useState(""),
    [details, setDetails] = useState(""),
    [sending, setSending] = useState(false),
    [error, setError] = useState("");
  const sendReport = async (event) => {
    event.preventDefault();
    if (!reason || details.trim().length < 10) return;
    setSending(true);
    setError("");
    try {
      await submit(reason, details);
    } catch (submitError) {
      setError(
        submitError.code === "23505"
          ? "Olet jo ilmoittanut tämän julkaisun ylläpidolle."
          : "Ilmoitusta ei voitu lähettää. Yritä myöhemmin uudelleen.",
      );
      setSending(false);
    }
  };
  return (
    <div className="modalback reportback">
      <form className="modal reportmodal" onSubmit={sendReport}>
        <button type="button" className="close" onClick={close}><X /></button>
        <div className="reporticon"><Flag /></div>
        <h2>Ilmoita asiaton sisältö</h2>
        <p>Ilmoitus koskee julkaisua <b>{notice.name}</b>. Ylläpito tarkistaa ilmoituksen.</p>
        <label>
          Ilmoituksen syy
          <select required value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="">Valitse syy</option>
            {Object.entries(REPORT_REASONS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label>
          Kuvaile ongelma
          <textarea
            required
            minLength={10}
            maxLength={1000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Kerro mahdollisimman selkeästi, mikä julkaisussa on asiatonta tai virheellistä."
          />
          <small>{details.length}/1000 merkkiä</small>
        </label>
        {error && <div className="autherror">{error}</div>}
        <button className="primary wide" disabled={sending || !reason || details.trim().length < 10}>
          <Flag /> {sending ? "Lähetetään…" : "Lähetä ilmoitus ylläpidolle"}
        </button>
      </form>
    </div>
  );
}

function AdminPanel({ notify, removeNotice }) {
  const [reports, setReports] = useState([]),
    [loading, setLoading] = useState(true),
    [filter, setFilter] = useState("pending"),
    [error, setError] = useState("");

  const loadReports = () => {
    setLoading(true);
    fetchReports()
      .then(setReports)
      .catch(() => setError("Raportteja ei voitu ladata."))
      .finally(() => setLoading(false));
  };
  useEffect(loadReports, []);

  const handleStatus = async (report, status) => {
    try {
      await setReportStatus(report.id, status);
      setReports((current) =>
        current.map((item) => (item.id === report.id ? { ...item, status } : item)),
      );
      notify(status === "dismissed" ? "Raportti hylättiin" : "Raportti käsiteltiin");
    } catch {
      setError("Raportin tilaa ei voitu päivittää.");
    }
  };
  const removeReportedNotice = async (report) => {
    if (!report.notice_id) return;
    if (!window.confirm(`Poistetaanko ilmoitus ”${report.notice_title}” pysyvästi?`)) return;
    const removed = await removeNotice(report.notice_id);
    if (removed) await handleStatus(report, "actioned");
  };
  const visible = reports.filter((report) => filter === "all" || report.status === filter);
  return (
    <section className="page adminpage">
      <div className="pagehead">
        <span className="kicker">YLLÄPITO</span>
        <h1>Sisältöraportit</h1>
        <p>Käsittele käyttäjien lähettämät ilmoitukset huolellisesti ja tasapuolisesti.</p>
      </div>
      <div className="adminfilters">
        <button className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Avoimet</button>
        <button className={filter === "dismissed" ? "active" : ""} onClick={() => setFilter("dismissed")}>Hylätyt</button>
        <button className={filter === "actioned" ? "active" : ""} onClick={() => setFilter("actioned")}>Toimenpiteet</button>
        <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Kaikki</button>
      </div>
      {error && <div className="autherror">{error}</div>}
      {loading ? (
        <div className="empty"><p>Ladataan raportteja…</p></div>
      ) : visible.length ? (
        <div className="reportlist">
          {visible.map((report) => (
            <article className="adminreport" key={report.id}>
              <div className="adminreporthead">
                <span className={`reportstatus ${report.status}`}>{report.status === "pending" ? "Avoin" : report.status === "dismissed" ? "Hylätty" : "Toimenpide tehty"}</span>
                <time>{new Date(report.created_at).toLocaleString("fi-FI")}</time>
              </div>
              <h2>{report.notice_title}</h2>
              <p><b>Ilmoitettu käyttäjä:</b> {report.reported_user_name}</p>
              <p><b>Syy:</b> {REPORT_REASONS[report.reason]}</p>
              <div className="reportdetails">{report.details}</div>
              {report.status === "pending" && (
                <div className="adminreportactions">
                  <button className="secondary" onClick={() => handleStatus(report, "dismissed")}>Ei toimenpiteitä</button>
                  <button className="deletebtn" disabled={!report.notice_id} onClick={() => removeReportedNotice(report)}><Trash2 /> Poista julkaisu</button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty"><ShieldCheck /><h3>Ei raportteja</h3><p>Tässä ryhmässä ei ole sisältöraportteja.</p></div>
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
        <p>Palvelun käyttö ei poista velvollisuutta tehdä tarvittavaa ilmoitusta viranomaisille.</p>
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
          Paikallinen palvelu kadonneiden ihmisten, eläinten, ajoneuvojen ja
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
