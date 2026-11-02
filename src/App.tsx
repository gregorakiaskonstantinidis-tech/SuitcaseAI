import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Backpack, CalendarDays, Check,
  CheckCircle2, ChevronRight, CircleHelp, CloudRain, CloudSun, Compass, Ellipsis,
  FileCheck2, Heart, Luggage as LuggageIcon, MapPin, Plus, Search, Shirt, Sparkles,
  Sun, ThumbsDown, ThumbsUp, Thermometer, Upload, UserRound, X,
} from 'lucide-react'
import { activitiesList, activityIcon, defaultChecklist, initialLuggage, initialWardrobe } from './data'
import { recommendOutfits, recommendPacking, usageEstimate } from './recommendations'
import { initialLearningProfile, learnedProfileSummary, recordOutfitFeedback } from './learning'
import { estimateTripWeather } from './weather'
import type { Clothing, LearningProfile, Luggage, Outfit, PackingItem, Trip, WeatherEstimate } from './types'

type Modal = 'clothing' | 'luggage' | null
const categories = ['All items', 'T-shirts', 'Shirts', 'Trousers', 'Jeans', 'Shorts', 'Dresses', 'Skirts', 'Jackets', 'Shoes', 'Accessories']
const imageFallback = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85'

function readStorage<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key)
  return stored ? JSON.parse(stored) as T : fallback
}

function useStoredState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initialValue))
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])
  return [value, setValue] as const
}

function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }) {
  if (!date) return 'Date to be decided'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', options)
}

function tripDays(departure: string, returnDate: string) {
  if (!departure || !returnDate) return 1
  const difference = Math.round((new Date(`${returnDate}T12:00:00`).getTime() - new Date(`${departure}T12:00:00`).getTime()) / 86400000)
  return Math.max(1, difference + 1)
}

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [wardrobe, setWardrobe] = useStoredState<Clothing[]>('suitcaseai-wardrobe', initialWardrobe)
  const [luggage, setLuggage] = useStoredState<Luggage[]>('suitcaseai-luggage', initialLuggage)
  const [trips, setTrips] = useStoredState<Trip[]>('suitcaseai-trips', [])
  const [profile, setProfile] = useStoredState<{ name: string; email: string }>('suitcaseai-profile', { name: 'Alex Morgan', email: 'alex@example.com' })
  const [learning, setLearning] = useStoredState<LearningProfile>('suitcaseai-learning', initialLearningProfile)
  const [authenticated, setAuthenticated] = useStoredState('suitcaseai-auth', false)
  const [modal, setModal] = useState<Modal>(null)
  const [editingClothing, setEditingClothing] = useState<Clothing | null>(null)
  const [editingLuggage, setEditingLuggage] = useState<Luggage | null>(null)
  const [toast, setToast] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }

  const enterDemo = () => {
    setProfile((current) => ({ ...current, name: current.name || 'Alex Morgan' }))
    setAuthenticated(true)
    navigate('/')
  }

  const saveTrip = (trip: Trip) => {
    setTrips((current) => current.some((item) => item.id === trip.id)
      ? current.map((item) => item.id === trip.id ? trip : item)
      : [trip, ...current])
  }

  const updateTrip = (tripId: string, updater: (trip: Trip) => Trip) => {
    setTrips((current) => current.map((trip) => trip.id === tripId ? updater(trip) : trip))
  }

  const isAuthPath = ['/welcome', '/login', '/create-account', '/onboarding'].includes(location.pathname)
  useEffect(() => {
    if (!authenticated && !isAuthPath) navigate('/welcome', { replace: true })
    if (authenticated && isAuthPath) navigate('/', { replace: true })
  }, [authenticated, isAuthPath, navigate])

  return (
    <>
      <Routes>
        <Route path="/welcome" element={<AuthScreen mode="welcome" onContinue={enterDemo} />} />
        <Route path="/login" element={<AuthScreen mode="login" onContinue={enterDemo} />} />
        <Route path="/create-account" element={<AuthScreen mode="signup" onContinue={enterDemo} onName={(name) => setProfile((current) => ({ ...current, name }))} />} />
        <Route path="/onboarding" element={<AuthScreen mode="onboarding" onContinue={enterDemo} onName={(name) => setProfile((current) => ({ ...current, name }))} />} />
        <Route path="*" element={authenticated
          ? <AppShell
            location={location.pathname}
            profile={profile}
            onNavigate={navigate}
            onLogout={() => { setAuthenticated(false); navigate('/welcome') }}
            wardrobeCount={wardrobe.length}
          >
            <Routes>
              <Route path="/" element={<HomePage profile={profile} trips={trips} luggage={luggage} wardrobe={wardrobe} onNavigate={navigate} />} />
              <Route path="/collection" element={<CollectionHub wardrobe={wardrobe} luggage={luggage} onAddClothing={() => { setEditingClothing(null); setModal('clothing') }} onEditClothing={(item) => { setEditingClothing(item); setModal('clothing') }} onDeleteClothing={(id) => { setWardrobe((current) => current.filter((item) => item.id !== id)); notify('Item removed from your wardrobe') }} onAddLuggage={() => { setEditingLuggage(null); setModal('luggage') }} onEditLuggage={(item) => { setEditingLuggage(item); setModal('luggage') }} onDeleteLuggage={(id) => { setLuggage((current) => current.filter((item) => item.id !== id)); notify('Luggage removed') }} />} />
              <Route path="/wardrobe" element={<WardrobePage wardrobe={wardrobe} onAdd={() => { setEditingClothing(null); setModal('clothing') }} onEdit={(item) => { setEditingClothing(item); setModal('clothing') }} onDelete={(id) => { setWardrobe((current) => current.filter((item) => item.id !== id)); notify('Item removed from your wardrobe') }} />} />
              <Route path="/luggage" element={<LuggagePage luggage={luggage} onAdd={() => { setEditingLuggage(null); setModal('luggage') }} onEdit={(item) => { setEditingLuggage(item); setModal('luggage') }} onDelete={(id) => { setLuggage((current) => current.filter((item) => item.id !== id)); notify('Luggage removed') }} />} />
              <Route path="/saved" element={<SavedTripsPage trips={trips} luggage={luggage} onOpen={(id) => navigate(`/trip/${id}`)} onEdit={(trip) => navigate(trip.id ? `/create-trip?edit=${trip.id}` : '/create-trip')} onDelete={(id) => { setTrips((current) => current.filter((trip) => trip.id !== id)); notify('Trip deleted') }} />} />
              <Route path="/profile" element={<ProfilePage profile={profile} onSave={setProfile} learning={learning} onLogout={() => { setAuthenticated(false); navigate('/welcome') }} />} />
              <Route path="/create-trip" element={<TripWizard wardrobe={wardrobe} luggage={luggage} trips={trips} learning={learning} onSave={saveTrip} notify={notify} />} />
              <Route path="/trip/:tripId" element={<TripPlan trips={trips} wardrobe={wardrobe} luggage={luggage} learning={learning} onLearn={(outfit, liked) => setLearning((current) => recordOutfitFeedback(current, outfit, liked))} onUpdate={updateTrip} onNavigate={navigate} notify={notify} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
          : <Navigate to="/welcome" replace />}
        />
      </Routes>

      {modal === 'clothing' && <ClothingModal item={editingClothing} onClose={() => setModal(null)} onSave={(item) => {
        setWardrobe((current) => editingClothing ? current.map((entry) => entry.id === item.id ? item : entry) : [item, ...current])
        setModal(null)
        notify(editingClothing ? 'Wardrobe item updated' : 'Added to your wardrobe')
      }} />}
      {modal === 'luggage' && <LuggageModal item={editingLuggage} onClose={() => setModal(null)} onSave={(item) => {
        setLuggage((current) => editingLuggage ? current.map((entry) => entry.id === item.id ? item : entry) : [item, ...current])
        setModal(null)
        notify(editingLuggage ? 'Luggage updated' : 'Luggage saved')
      }} />}
      {toast && <div className="toast"><CheckCircle2 size={17} />{toast}</div>}
    </>
  )
}

function AuthScreen({ mode, onContinue, onName }: { mode: 'welcome' | 'login' | 'signup' | 'onboarding'; onContinue: () => void; onName?: (name: string) => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const welcome = mode === 'welcome'
  const onboarding = mode === 'onboarding'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (onName && name.trim()) onName(name.trim())
    onContinue()
  }

  return (
    <main className="auth-page">
      <div className="auth-top"><Brand /><span>Already have an account? <Link to="/login">Log in</Link></span></div>
      <div className="auth-content">
        <section className="auth-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR PERSONAL PACKING ASSISTANT</div>
          <h1>{welcome ? <>Pack smarter.<br /><span>Travel lighter.</span></> : onboarding ? <>A little about<br /><span>you.</span></> : mode === 'login' ? <>Welcome<br /><span>back.</span></> : <>Travel starts<br /><span>with less.</span></>}</h1>
          <p>{welcome ? 'Thoughtful packing, made personal. Build a wardrobe that travels as well as you do.' : onboarding ? 'Let’s personalize your packing experience.' : mode === 'login' ? 'Your next trip is closer than you think.' : 'Create your account and make room for the good stuff.'}</p>
          {welcome ? <div className="auth-actions"><button className="button button-primary button-large" onClick={() => navigate('/create-account')}>Create your account <ArrowRight size={17} /></button><button className="button button-text" onClick={onContinue}>Explore the demo <ArrowUpRight size={16} /></button></div>
            : <form className="auth-form" onSubmit={submit}>
              {(mode === 'signup' || onboarding) && <label>Your name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex Morgan" required autoComplete="name" /></label>}
              {!onboarding && <label>Email address<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" type="email" required autoComplete="email" /></label>}
              {!onboarding && <label>Password<input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" type="password" minLength={8} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></label>}
              <button className="button button-primary button-large" type="submit">{onboarding ? 'Let’s get packing' : mode === 'login' ? 'Log in' : 'Create account'} <ArrowRight size={17} /></button>
              <button type="button" className="button button-text" onClick={onContinue}>Continue with demo account</button>
            </form>}
          <div className="auth-footnote"><Check size={14} /> Your wardrobe stays yours. No backend, just a private demo.</div>
        </section>
        <section className="auth-art" aria-label="Travel inspiration">
          <img src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=90" alt="Suitcase ready for an adventure" />
          <div className="art-shade" />
          <div className="art-caption"><span>THE ART OF GOING LIGHT</span><strong>More room for<br />the moments.</strong><div><span className="art-line" /> A better kind of travel begins here</div></div>
          <div className="art-card"><span className="art-card-icon"><Sparkles size={16} /></span><div><strong>Thoughtfully packed</strong><small>12 pieces · 8 easy outfits</small></div><CheckCircle2 size={18} /></div>
        </section>
      </div>
      <footer className="auth-footer"><span>© 2026 SuitcaseAI</span><span>Pack with intention. Go with ease.</span></footer>
    </main>
  )
}

function Brand() {
  return <div className="brand"><span className="brand-mark"><LuggageIcon size={20} strokeWidth={1.8} /></span><span>Suitcase<span className="brand-ai">AI</span></span></div>
}

const navigation = [
  { path: '/', label: 'Home', icon: Compass },
  { path: '/wardrobe', label: 'Wardrobe', icon: Shirt },
  { path: '/luggage', label: 'Luggage', icon: LuggageIcon },
  { path: '/saved', label: 'Saved trips', icon: FileCheck2 },
  { path: '/profile', label: 'Profile', icon: UserRound },
]
const bottomNavigation = [
  { path: '/create-trip', label: 'Trip', icon: Compass },
  { path: '/collection', label: 'Closet & bags', icon: Backpack },
  { path: '/saved', label: 'Saved trips', icon: FileCheck2 },
]

function AppShell({ children, location, profile, onNavigate, onLogout, wardrobeCount }: { children: ReactNode; location: string; profile: { name: string; email: string }; onNavigate: (path: string) => void; onLogout: () => void; wardrobeCount: number }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const activePath = location.startsWith('/trip/') || location === '/saved'
    ? '/saved'
    : location.startsWith('/create-trip') ? '/create-trip'
      : ['/wardrobe', '/luggage', '/collection'].includes(location) ? '/collection' : location
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand brand-button" onClick={() => onNavigate('/')}><span className="brand-mark"><LuggageIcon size={20} /></span><span>Suitcase<span className="brand-ai">AI</span></span></button>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav">
          {navigation.map(({ path, label, icon: Icon }) => <button key={path} className={`nav-link ${activePath === path ? 'active' : ''}`} onClick={() => onNavigate(path)}><Icon size={18} /><span>{label}</span>{label === 'Wardrobe' && <span className="nav-count">{wardrobeCount}</span>}</button>)}
        </nav>
        <button className="sidebar-trip" onClick={() => onNavigate('/create-trip')}><span className="sidebar-trip-icon"><Plus size={18} /></span><span><strong>Plan a trip</strong><small>Let's get you ready</small></span><ArrowRight size={16} /></button>
        <div className="sidebar-bottom">
          <div className="sidebar-help"><span><CircleHelp size={17} /></span><div><strong>Need a hand?</strong><small>We’re here to help</small></div><ChevronRight size={15} /></div>
          <button className="profile-mini" onClick={() => onNavigate('/profile')}><span className="avatar">{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span className="profile-mini-copy"><strong>{profile.name || 'Alex Morgan'}</strong><small>Personal account</small></span><Ellipsis size={18} onClick={(event) => { event.stopPropagation(); setMenuOpen((open) => !open) }} /></button>
          {menuOpen && <div className="profile-popover"><button onClick={() => { setMenuOpen(false); onNavigate('/profile') }}>Profile settings</button><button onClick={onLogout}>Log out</button></div>}
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="mobile-brand"><button className="brand brand-button" onClick={() => onNavigate('/')}><Brand /></button></div><div className="breadcrumb"><span>SuitcaseAI</span><ChevronRight size={13} /><strong>{location.startsWith('/trip/') ? 'Your packing plan' : location.startsWith('/create-trip') ? 'New trip' : location === '/collection' ? 'Closet & bags' : navigation.find((item) => item.path === location)?.label ?? 'Home'}</strong></div><div className="topbar-right"><button className="icon-button" aria-label="Open wardrobe and luggage" onClick={() => onNavigate('/collection')}><Search size={18} /></button><button className="avatar avatar-small" onClick={() => onNavigate('/profile')}>{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</button></div></header>
        <div className="page-content">{children}</div>
      </main>
      <nav className="mobile-nav">{bottomNavigation.map(({ path, label, icon: Icon }) => <button key={path} className={activePath === path ? 'active' : ''} onClick={() => onNavigate(path)}><Icon size={20} /><span>{label === 'Saved trips' ? 'Saved' : label}</span></button>)}</nav>
    </div>
  )
}

function HomePage({ profile, trips, luggage, wardrobe, onNavigate }: { profile: { name: string }; trips: Trip[]; luggage: Luggage[]; wardrobe: Clothing[]; onNavigate: (path: string) => void }) {
  const upcoming = trips.filter((trip) => trip.departure >= new Date().toISOString().slice(0, 10)).slice(0, 2)
  const nextTrip = upcoming[0]
  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()
  return (
    <div className="page home-page">
      <section className="welcome-row">
        <div><div className="eyebrow">{today} <span className="eyebrow-dot" /></div><h1>{greeting}, {profile.name.split(' ')[0] || 'Alex'}<span className="wave">✳</span></h1><p>Where will the world take you next?</p></div>
        <button className="button button-primary" onClick={() => onNavigate('/create-trip')}><Plus size={17} /> Plan a new trip</button>
      </section>
      <section className="hero-card">
        <img src="https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1500&q=90" alt="Colorful coastal village in Italy" />
        <div className="hero-overlay" />
        <div className="hero-copy"><span className="hero-label"><span className="hero-label-dot" /> A LITTLE INSPIRATION</span><h2>Make room<br />for the <em>unexpected.</em></h2><p>Less time deciding what to pack.<br />More time dreaming where to go.</p><button className="button button-light" onClick={() => onNavigate('/create-trip')}>Plan your next escape <ArrowRight size={16} /></button></div>
        <div className="hero-index"><span>01</span><i /> 03</div>
      </section>

      <section className="home-section">
        <div className="section-heading"><div><div className="eyebrow">YOUR TRAVEL PLANS</div><h2>Trips on the horizon</h2></div><button className="text-link" onClick={() => onNavigate('/saved')}>See all trips <ArrowRight size={15} /></button></div>
        {nextTrip ? <div className="trip-preview-grid">{upcoming.map((trip) => <TripCard key={trip.id} trip={trip} luggage={luggage} onClick={() => onNavigate(`/trip/${trip.id}`)} />)}<button className="trip-add-card" onClick={() => onNavigate('/create-trip')}><span><Plus size={21} /></span><strong>Somewhere new?</strong><small>Start planning your next trip</small></button></div>
          : <div className="empty-trip"><div className="empty-illustration"><MapPin size={22} /><span>✦</span></div><div><strong>Nothing on the calendar. Yet.</strong><p>Your next great story starts with a destination.</p></div><button className="button button-outline" onClick={() => onNavigate('/create-trip')}>Plan your first trip <ArrowRight size={15} /></button></div>}
      </section>

      <section className="home-bottom-grid">
        <div className="home-section wardrobe-snapshot">
          <div className="section-heading"><div><div className="eyebrow">READY WHEN YOU ARE</div><h2>Your travel wardrobe</h2></div><button className="icon-button" aria-label="Open wardrobe" onClick={() => onNavigate('/wardrobe')}><ArrowUpRight size={17} /></button></div>
          <div className="wardrobe-tiles">{wardrobe.slice(0, 4).map((item) => <button key={item.id} className="wardrobe-tile" onClick={() => onNavigate('/wardrobe')}><img src={item.image} alt={item.name} /><span>{item.name}</span></button>)}</div>
          <div className="snapshot-foot"><span>{wardrobe.length} pieces you love</span><button className="text-link" onClick={() => onNavigate('/wardrobe')}>View wardrobe <ArrowRight size={14} /></button></div>
        </div>
        <div className="home-section stat-panel">
          <div className="eyebrow">A LITTLE LESS, A LOT MORE</div><h2>Your travel, at a glance</h2>
          <div className="stat-line"><span className="stat-icon blue"><LuggageIcon size={17} /></span><div><strong>{trips.length} trips planned</strong><small>Ready for wherever</small></div><span className="stat-value">{trips.length}</span></div>
          <div className="stat-line"><span className="stat-icon peach"><Shirt size={17} /></span><div><strong>{wardrobe.length} wardrobe pieces</strong><small>All in your own rotation</small></div><span className="stat-value">{wardrobe.length}</span></div>
          <div className="stat-line"><span className="stat-icon green"><Backpack size={17} /></span><div><strong>{luggage.length} bags in your collection</strong><small>Right-sized for every trip</small></div><span className="stat-value">{luggage.length}</span></div>
        </div>
      </section>
      <div className="home-note"><span><Sparkles size={15} /></span> Better packing isn’t about bringing more. It’s about bringing what works.</div>
    </div>
  )
}

function TripCard({ trip, luggage, onClick }: { trip: Trip; luggage: Luggage[]; onClick: () => void }) {
  const bag = luggage.find((item) => item.id === trip.luggageId)
  const packed = trip.packing.filter((item) => item.packed).length
  const percent = trip.packing.length ? Math.round((packed / trip.packing.length) * 100) : 0
  return <button className="trip-card" onClick={onClick}><div className="trip-card-image"><img src={`https://images.unsplash.com/${trip.destination.toLowerCase().includes('lisbon') ? 'photo-1555881400-74d7acaacd8b' : 'photo-1516483638261-f4dbaf036963'}?auto=format&fit=crop&w=650&q=85`} alt="" /><span className="trip-card-date"><CalendarDays size={13} />{dateLabel(trip.departure)} – {dateLabel(trip.returnDate)}</span></div><div className="trip-card-body"><div><span className="trip-card-kicker">{trip.days} DAYS AWAY</span><h3>{trip.destination}</h3></div><span className="trip-arrow"><ArrowUpRight size={17} /></span><div className="trip-card-meta"><span><LuggageIcon size={14} />{bag?.name ?? 'Luggage not selected'}</span><span>{trip.activities[0] ?? 'Your trip'}</span></div><div className="mini-progress"><span style={{ width: `${percent}%` }} /></div><small>{percent}% packed</small></div></button>
}

function CollectionHub({ wardrobe, luggage, onAddClothing, onEditClothing, onDeleteClothing, onAddLuggage, onEditLuggage, onDeleteLuggage }: {
  wardrobe: Clothing[]
  luggage: Luggage[]
  onAddClothing: () => void
  onEditClothing: (item: Clothing) => void
  onDeleteClothing: (id: string) => void
  onAddLuggage: () => void
  onEditLuggage: (item: Luggage) => void
  onDeleteLuggage: (id: string) => void
}) {
  const [section, setSection] = useState<'wardrobe' | 'luggage'>('wardrobe')
  return <div className="collection-hub">
    <div className="hub-switch" role="tablist" aria-label="Your travel collection">
      <button role="tab" aria-selected={section === 'wardrobe'} className={section === 'wardrobe' ? 'selected' : ''} onClick={() => setSection('wardrobe')}><Shirt size={16} /> Closet <span>{wardrobe.length}</span></button>
      <button role="tab" aria-selected={section === 'luggage'} className={section === 'luggage' ? 'selected' : ''} onClick={() => setSection('luggage')}><LuggageIcon size={16} /> Suitcases <span>{luggage.length}</span></button>
    </div>
    {section === 'wardrobe'
      ? <WardrobePage wardrobe={wardrobe} onAdd={onAddClothing} onEdit={onEditClothing} onDelete={onDeleteClothing} />
      : <LuggagePage luggage={luggage} onAdd={onAddLuggage} onEdit={onEditLuggage} onDelete={onDeleteLuggage} />}
  </div>
}

function WardrobePage({ wardrobe, onAdd, onEdit, onDelete }: { wardrobe: Clothing[]; onAdd: () => void; onEdit: (item: Clothing) => void; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState('All items')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [menu, setMenu] = useState<string | null>(null)
  const filtered = wardrobe.filter((item) => (filter === 'All items' || item.category === filter) && `${item.name} ${item.color} ${item.category}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="page">
    <PageTitle eyebrow="THE PIECES THAT GO PLACES" title="Your wardrobe" subtitle="A little less deciding. A lot more wearing." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add a piece</button>} />
    <div className="collection-summary"><div className="collection-number">{wardrobe.length.toString().padStart(2, '0')}</div><div><strong>pieces, ready to roam</strong><p>Your personal closet, thoughtfully in one place.</p></div><div className="summary-tags"><span><span className="tiny-dot blue-dot" /> {wardrobe.filter((item) => ['Shorts', 'Dresses', 'T-shirts'].includes(item.category) || /linen|lightweight/i.test(item.name)).length} warm-weather picks</span><span><span className="tiny-dot peach-dot" /> {new Set(wardrobe.map((item) => item.category)).size} clothing types</span></div></div>
    <div className="collection-toolbar"><div className="filter-scroll">{categories.map((category) => <button key={category} className={`filter-chip ${filter === category ? 'selected' : ''}`} onClick={() => setFilter(category)}>{category}</button>)}</div><div className="toolbar-right"><label className="search-field"><Search size={16} /><input placeholder="Search pieces" value={search} onChange={(event) => setSearch(event.target.value)} /></label><div className="view-switch"><button className={view === 'grid' ? 'selected' : ''} aria-label="Grid view" onClick={() => setView('grid')}><span className="grid-glyph">▦</span></button><button className={view === 'list' ? 'selected' : ''} aria-label="List view" onClick={() => setView('list')}><span>☷</span></button></div></div></div>
    {filtered.length ? <div className={view === 'grid' ? 'wardrobe-grid' : 'wardrobe-list'}>{filtered.map((item) => <article className={`clothing-card ${view === 'list' ? 'clothing-list-card' : ''}`} key={item.id}><button className="clothing-photo" onClick={() => onEdit(item)}><img src={item.image || imageFallback} alt={item.name} /><span className="photo-category">{item.category}</span></button><div className="clothing-info"><div><h3>{item.name}</h3><span>{item.color}</span></div><button className="more-button" aria-label={`Options for ${item.name}`} onClick={() => setMenu(menu === item.id ? null : item.id)}><Ellipsis size={19} /></button>{menu === item.id && <div className="card-menu"><button onClick={() => { setMenu(null); onEdit(item) }}>Edit piece</button><button className="danger-text" onClick={() => { setMenu(null); onDelete(item.id) }}>Remove</button></div>}</div><div className="clothing-tags"><span>Auto-matched for your trips</span></div></article>)}
      <button className="add-clothing-card" onClick={onAdd}><span><Plus size={20} /></span><strong>Add something you love</strong><small>Your next go-to might be waiting</small></button></div>
      : <EmptyState title="No pieces found" description={search ? 'Try another search or clear your filters.' : 'Add your first piece to start building a travel-ready wardrobe.'} action={<button className="button button-primary" onClick={onAdd}><Plus size={16} /> Add a piece</button>} />}
  </div>
}

function LuggagePage({ luggage, onAdd, onEdit, onDelete }: { luggage: Luggage[]; onAdd: () => void; onEdit: (item: Luggage) => void; onDelete: (id: string) => void }) {
  const [menu, setMenu] = useState<string | null>(null)
  return <div className="page">
    <PageTitle eyebrow="THE RIGHT BAG FOR THE RIGHT GETAWAY" title="Your luggage" subtitle="Every trip deserves the right amount of room." action={<button className="button button-primary" onClick={onAdd}><Plus size={17} /> Add luggage</button>} />
    <div className="luggage-intro"><div className="luggage-intro-icon"><LuggageIcon size={22} /></div><div><strong>Keep your bags close.</strong><p>SuitcaseAI uses your bag’s capacity to help keep your packing plan practical.</p></div><span className="luggage-total">{luggage.length} {luggage.length === 1 ? 'bag' : 'bags'}</span></div>
    <div className="luggage-grid">{luggage.map((item, index) => <article className="luggage-card" key={item.id}><div className={`luggage-image ${index % 2 ? 'tint-peach' : ''}`}><img src={item.image || imageFallback} alt={item.name} /><span className="bag-label">{item.type}</span><button className="more-button luggage-more" aria-label={`Options for ${item.name}`} onClick={() => setMenu(menu === item.id ? null : item.id)}><Ellipsis size={18} /></button>{menu === item.id && <div className="card-menu"><button onClick={() => { setMenu(null); onEdit(item) }}>Edit bag</button><button className="danger-text" onClick={() => { setMenu(null); onDelete(item.id) }}>Remove</button></div>}</div><div className="luggage-card-copy"><div><h3>{item.name}</h3><p>{item.dimensions || 'Dimensions not added'}</p></div><div className="capacity"><strong>{item.capacity}<small>L</small></strong><span>approx. capacity</span></div></div><div className="capacity-track"><span style={{ width: `${Math.min(100, item.capacity / 0.75)}%` }} /></div><div className="capacity-footer"><span>Personal item</span><span>Checked bag</span></div></article>)}
      <button className="add-luggage-card" onClick={onAdd}><span><Plus size={20} /></span><strong>Add another bag</strong><small>One for every kind of trip</small></button>
    </div>
  </div>
}

function SavedTripsPage({ trips, luggage, onOpen, onEdit, onDelete }: { trips: Trip[]; luggage: Luggage[]; onOpen: (id: string) => void; onEdit: (trip: Trip) => void; onDelete: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const filtered = trips.filter((trip) => trip.destination.toLowerCase().includes(query.toLowerCase()))
  return <div className="page">
    <PageTitle eyebrow="ALL THE PLACES YOU’RE GOING" title="Saved trips" subtitle="Every plan, packed and ready when you are." action={<button className="button button-primary" onClick={() => onEdit({} as Trip)}><Plus size={17} /> Plan a new trip</button>} />
    <div className="saved-toolbar"><span>{trips.length} {trips.length === 1 ? 'trip' : 'trips'} saved</span><label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a destination" /></label></div>
    {filtered.length ? <div className="saved-grid">{filtered.map((trip) => <div className="saved-item" key={trip.id}><TripCard trip={trip} luggage={luggage} onClick={() => onOpen(trip.id)} /><button className="saved-menu-button" onClick={() => setMenu(menu === trip.id ? null : trip.id)} aria-label="Trip options"><Ellipsis size={18} /></button>{menu === trip.id && <div className="card-menu saved-menu"><button onClick={() => { setMenu(null); onEdit(trip) }}>Edit trip</button><button onClick={() => { setMenu(null); onDelete(trip.id) }}>Delete trip</button></div>}</div>)}</div> : <EmptyState title={query ? 'No matching destinations' : 'Your next trip belongs here'} description={query ? 'Try searching for another place.' : 'Start with a destination. We’ll help with everything that goes in between.'} action={<button className="button button-primary" onClick={() => onEdit({} as Trip)}><Plus size={16} /> Plan a new trip</button>} />}
  </div>
}

function ProfilePage({ profile, onSave, learning, onLogout }: { profile: { name: string; email: string }; onSave: (profile: { name: string; email: string }) => void; learning: LearningProfile; onLogout: () => void }) {
  const [form, setForm] = useState(profile)
  const [saved, setSaved] = useState(false)
  return <div className="page">
    <PageTitle eyebrow="A LITTLE SPACE, JUST FOR YOU" title="Your profile" subtitle="The details that make every trip feel like yours." />
    <div className="profile-layout"><div className="profile-card"><div className="profile-cover"><span className="profile-avatar-large">{profile.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span></div><div className="profile-card-body"><h2>{profile.name || 'Your name'}</h2><p>{profile.email || 'Your email address'}</p><div className="profile-membership"><Sparkles size={14} /> SuitcaseAI traveler</div><div className="profile-card-stat"><div><strong>Your AI packing coach</strong><span>{learning.feedbackCount ? `Learned from ${learning.feedbackCount} outfit ratings` : 'Ready to learn what you love'}</span></div><Sparkles size={17} /></div></div></div>
      <form className="settings-card" onSubmit={(event) => { event.preventDefault(); onSave(form); setSaved(true); window.setTimeout(() => setSaved(false), 2500) }}><div className="card-heading"><div><div className="eyebrow">YOUR DETAILS</div><h2>Make it personal</h2></div><UserRound size={19} /></div><label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email address<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><div className="settings-buttons"><button className="button button-primary" type="submit">{saved ? <><Check size={16} /> Saved</> : 'Save changes'}</button><button className="button button-outline danger-outline" type="button" onClick={onLogout}>Log out</button></div></form>
    </div>
    <div className="learning-card"><span className="learning-card-icon"><Sparkles size={19} /></span><div><strong>Your style, learned as you go</strong><p>{learnedProfileSummary(learning)} Rate outfit ideas with a thumbs-up or down; your feedback stays on this device.</p></div><span className="learning-count">{learning.feedbackCount} ratings</span></div>
    <div className="privacy-note"><span><Heart size={16} /></span><div><strong>Your things are yours.</strong><p>This prototype saves your wardrobe, trips, and preferences only in this browser.</p></div></div>
  </div>
}

const wizardTitles = ['Trip & dates', 'Suitcase', 'Activities', 'Packing', 'Outfits', 'Checklist']
const initialForm = () => ({ destination: '', departure: '', returnDate: '', luggageId: '', activities: [] as string[], customActivity: '', weather: 'Mild & mixed', outfitCount: 4, reuse: true, hybrid: true, laundry: false })
type TripFormState = ReturnType<typeof initialForm>

function TripWizard({ wardrobe, luggage, trips, learning, onSave, notify }: { wardrobe: Clothing[]; luggage: Luggage[]; trips: Trip[]; learning: LearningProfile; onSave: (trip: Trip) => void; notify: (message: string) => void }) {
  const navigate = useNavigate()
  const [searchParams] = useState(() => new URLSearchParams(window.location.search))
  const editingId = searchParams.get('edit')
  const existing = trips.find((trip) => trip.id === editingId)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<TripFormState>(() => existing ? {
    destination: existing.destination, departure: existing.departure, returnDate: existing.returnDate,
    luggageId: existing.luggageId, activities: existing.activities, customActivity: '',
    weather: existing.weather, outfitCount: existing.preferences.outfitCount, reuse: existing.preferences.reuse,
    hybrid: existing.preferences.hybrid, laundry: existing.preferences.laundry,
  } : initialForm())
  const [error, setError] = useState('')
  const [weatherEstimate, setWeatherEstimate] = useState<WeatherEstimate | null>(existing?.weatherEstimate ?? null)
  const [weatherStatus, setWeatherStatus] = useState<'idle' | 'loading' | 'ready'>('idle')
  const [draftOutfits, setDraftOutfits] = useState<Outfit[] | null>(() => existing?.outfits ?? null)
  const [draftPacking, setDraftPacking] = useState<PackingItem[] | null>(() => existing?.packing ?? null)
  const [draftChecklist, setDraftChecklist] = useState<PackingItem[] | null>(() => existing?.checklist ?? null)
  const [customChecklistItem, setCustomChecklistItem] = useState('')
  const days = tripDays(form.departure, form.returnDate)
  const selectedBag = luggage.find((bag) => bag.id === form.luggageId)
  const activities = [...form.activities, ...(form.customActivity.trim() ? [form.customActivity.trim()] : [])]
  const setField = <K extends keyof TripFormState>(key: K, value: TripFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setDraftOutfits(null)
    setDraftPacking(null)
  }
  const toggleActivity = (activity: string) => {
    setForm((current) => ({ ...current, activities: current.activities.includes(activity) ? current.activities.filter((item) => item !== activity) : [...current.activities, activity] }))
    setDraftOutfits(null)
    setDraftPacking(null)
  }
  const recommendationTrip: Trip = {
    id: existing?.id ?? 'preview',
    destination: form.destination,
    departure: form.departure,
    returnDate: form.returnDate,
    days,
    luggageId: form.luggageId,
    activities,
    weather: form.weather,
    weatherEstimate: weatherEstimate ?? undefined,
    preferences: { outfitCount: form.outfitCount, reuse: form.reuse, hybrid: form.hybrid, laundry: form.laundry },
    packing: [],
    checklist: [],
    createdAt: existing?.createdAt ?? '',
  }
  const generatedOutfits = useMemo(() => recommendOutfits(wardrobe, recommendationTrip, learning, selectedBag?.capacity), [wardrobe, form.destination, form.departure, form.returnDate, form.luggageId, form.activities, form.customActivity, form.weather, form.outfitCount, form.reuse, form.hybrid, form.laundry, learning, selectedBag?.capacity])
  const outfits = draftOutfits ?? generatedOutfits
  const suggestedPacking = useMemo(() => recommendPacking(wardrobe, generatedOutfits, days, form.laundry, form.weather), [wardrobe, generatedOutfits, days, form.laundry, form.weather])
  const packing = draftPacking ?? suggestedPacking
  const checklist = draftChecklist ?? defaultChecklist(days).filter((item) => item.category !== 'Clothing basics')
  const usage = usageEstimate(packing, selectedBag?.capacity ?? 38)

  useEffect(() => {
    if (!form.destination.trim() || !form.departure || !form.returnDate || new Date(`${form.returnDate}T12:00:00`) < new Date(`${form.departure}T12:00:00`)) {
      setWeatherStatus('idle')
      return
    }
    let cancelled = false
    setWeatherStatus('loading')
    const timeout = window.setTimeout(() => {
      estimateTripWeather(form.destination, form.departure, form.returnDate).then((estimate) => {
        if (cancelled) return
        setWeatherEstimate(estimate)
        setWeatherStatus('ready')
        setField('weather', estimate.category)
      }).catch((reason: unknown) => {
        if (cancelled) return
        console.error('Unable to estimate trip weather', reason)
        setWeatherStatus('idle')
        setError('We couldn’t estimate the weather just now. You can still choose conditions manually.')
      })
    }, 450)
    return () => { cancelled = true; window.clearTimeout(timeout) }
  }, [form.destination, form.departure, form.returnDate])

  const next = () => {
    setError('')
    if (step === 0 && (!form.destination.trim() || !form.departure || !form.returnDate || new Date(`${form.returnDate}T12:00:00`) < new Date(`${form.departure}T12:00:00`))) {
      setError('Add a destination and valid travel dates to continue.')
      return
    }
    if (step === 1 && !form.luggageId) {
      setError('Choose the bag you’ll be taking along.')
      return
    }
    if (step === 2 && !activities.length) {
      setError('Choose at least one thing you’ll be doing.')
      return
    }
    if (step < 5) setStep((current) => current + 1)
    else {
      const tripDraft: Trip = {
        id: existing?.id ?? `trip-${Date.now()}`,
        destination: form.destination.trim(),
        departure: form.departure,
        returnDate: form.returnDate,
        days,
        luggageId: form.luggageId,
        activities,
        weather: form.weather,
        weatherEstimate: weatherEstimate ?? undefined,
        preferences: { outfitCount: form.outfitCount, reuse: form.reuse, hybrid: form.hybrid, laundry: form.laundry },
        outfits,
        packing,
        checklist,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      }
      onSave(tripDraft)
      notify(existing ? 'Your trip has been updated' : 'Your packing plan is ready')
      navigate(`/trip/${tripDraft.id}`)
    }
  }

  const updatePackingItem = (id: string, update: (item: PackingItem) => PackingItem) => {
    setDraftPacking((current) => (current ?? packing).map((item) => item.id === id ? update(item) : item))
  }
  const toggleWardrobePacking = (item: Clothing) => {
    const packingId = `wardrobe-${item.id}`
    setDraftPacking((current) => {
      const base = current ?? packing
      return base.some((entry) => entry.wardrobeId === item.id)
        ? base.filter((entry) => entry.wardrobeId !== item.id)
        : [...base, { id: packingId, name: item.name, category: item.category, quantity: 1, packed: false, wardrobeId: item.id }]
    })
  }
  const updateOutfit = (outfitIndex: number, itemIndex: number, replacement: Clothing) => {
    const updated = outfits.map((outfit, index) => index === outfitIndex
      ? { ...outfit, items: outfit.items.map((item, currentIndex) => currentIndex === itemIndex ? replacement : item) }
      : outfit)
    setDraftOutfits(updated)
    const usedIds = new Set(updated.flatMap((outfit) => outfit.items.map((item) => item.id)))
    setDraftPacking((current) => {
      const base = current ?? packing
      const retained = base.filter((item) => !item.wardrobeId || usedIds.has(item.wardrobeId))
      const retainedIds = new Set(retained.map((item) => item.wardrobeId))
      return [...retained, ...wardrobe.filter((item) => usedIds.has(item.id) && !retainedIds.has(item.id)).map((item) => ({
        id: `wardrobe-${item.id}`, name: item.name, category: item.category, quantity: 1, packed: false, wardrobeId: item.id,
      }))]
    })
  }
  const addOutfitItem = (outfitIndex: number, itemId: string) => {
    const item = wardrobe.find((entry) => entry.id === itemId)
    if (!item || outfits[outfitIndex]?.items.some((entry) => entry.id === item.id)) return
    const updated = outfits.map((outfit, index) => index === outfitIndex ? { ...outfit, items: [...outfit.items, item] } : outfit)
    setDraftOutfits(updated)
    setDraftPacking((current) => {
      const base = current ?? packing
      return base.some((entry) => entry.wardrobeId === item.id) ? base : [...base, {
        id: `wardrobe-${item.id}`, name: item.name, category: item.category, quantity: 1, packed: false, wardrobeId: item.id,
      }]
    })
  }
  const addChecklistItem = (event: FormEvent) => {
    event.preventDefault()
    if (!customChecklistItem.trim()) return
    setDraftChecklist((current) => [...(current ?? checklist), {
      id: `custom-${Date.now()}`, name: customChecklistItem.trim(), category: 'Your additions', quantity: 1, packed: false,
    }])
    setCustomChecklistItem('')
  }

  return <div className="page wizard-page">
    <button className="back-link" onClick={() => navigate(existing ? `/trip/${existing.id}` : '/')}><ArrowLeft size={16} /> {existing ? 'Back to trip' : 'Back to home'}</button>
    <div className="wizard-heading"><div><div className="eyebrow">{existing ? 'MAKE IT YOURS' : 'YOUR TRIP, STEP BY STEP'}</div><h1>{existing ? 'Edit your trip' : 'Let’s plan your trip.'}</h1><p>We’ll help with the weather, outfits, and essentials as you go.</p></div><span className="wizard-count">0{step + 1}<i>/</i>0{wizardTitles.length}</span></div>
    <div className="wizard-progress"><div className="wizard-steps">{wizardTitles.map((title, index) => <button key={title} className={`wizard-step ${step === index ? 'current' : ''} ${step > index ? 'complete' : ''}`} onClick={() => index < step && setStep(index)}><span>{step > index ? <Check size={14} /> : `0${index + 1}`}</span><small>{title}</small></button>)}</div><div className="wizard-progress-track"><span style={{ width: `${((step + 1) / wizardTitles.length) * 100}%` }} /></div></div>
    <section className="wizard-card">
      {step === 0 && <div className="wizard-step-content"><StepIntro icon={<MapPin size={20} />} eyebrow="STEP 1 · TRIP & DATES" title="Where are we going?" description="Choose your destination and dates." /><div className="form-grid"><label className="field-full">Destination<input value={form.destination} onChange={(event) => setField('destination', event.target.value)} placeholder="e.g. Copenhagen, Denmark" autoFocus /><small><MapPin size={12} /> Weather updates automatically</small></label><label>Departure<input type="date" value={form.departure} onChange={(event) => setField('departure', event.target.value)} min={new Date().toISOString().slice(0, 10)} /></label><label>Return<input type="date" value={form.returnDate} onChange={(event) => setField('returnDate', event.target.value)} min={form.departure || new Date().toISOString().slice(0, 10)} /></label></div>{form.departure && form.returnDate && <div className="duration-pill"><CalendarDays size={15} /> <strong>{days} days</strong> away</div>}<div className="wizard-weather"><WeatherCard estimate={weatherEstimate} loading={weatherStatus === 'loading'} /></div></div>}
      {step === 1 && <div className="wizard-step-content"><StepIntro icon={<LuggageIcon size={20} />} eyebrow="STEP 2 · SUITCASE" title="Choose your suitcase." description="Pick the bag you’ll take." />{luggage.length ? <div className="luggage-select-grid">{luggage.map((bag) => <button key={bag.id} className={`luggage-select-card ${form.luggageId === bag.id ? 'chosen' : ''}`} onClick={() => setField('luggageId', bag.id)}><span className="selection-check">{form.luggageId === bag.id && <Check size={13} />}</span><img src={bag.image || imageFallback} alt="" /><div><span className="eyebrow">{bag.type}</span><strong>{bag.name}</strong><small>{bag.capacity}L · {bag.dimensions}</small></div><ArrowUpRight size={16} /></button>)}</div> : <EmptyState title="No bags yet" description="Add a suitcase to continue." action={<button className="button button-primary" onClick={() => navigate('/luggage')}>Add a bag <ArrowRight size={15} /></button>} />}</div>}
      {step === 2 && <div className="wizard-step-content"><StepIntro icon={<Sun size={20} />} eyebrow="STEP 3 · ACTIVITIES" title="What are you doing?" description="Choose all that apply." /><div className="activity-grid">{activitiesList.map((activity) => <button key={activity} className={`activity-option ${form.activities.includes(activity) ? 'selected' : ''}`} onClick={() => toggleActivity(activity)}><span>{activityIcon[activity]}</span><strong>{activity}</strong>{form.activities.includes(activity) && <Check size={14} />}</button>)}</div><div className="custom-activity"><label className="custom-activity-name">Something else<input placeholder="Add an activity" value={form.customActivity} onChange={(event) => setField('customActivity', event.target.value)} /></label></div></div>}
      {step === 3 && <div className="wizard-step-content"><StepIntro icon={<Sparkles size={20} />} eyebrow="STEP 4 · PACKING LIST" title="What would you like to pack?" description="We’ve picked clothes for your trip. Add or remove any item." /><div className="wizard-packing-summary"><div className="wizard-packing-summary-top"><span><LuggageIcon size={17} /> Bag space</span><strong>{usage}% <small>of {selectedBag?.capacity ?? 38}L</small></strong></div><div className="wizard-capacity-track"><span style={{ width: `${usage}%` }} /></div><small>Space is an estimate.</small></div><div className="wizard-packing-section"><h3>Your clothes <span>{packing.filter((item) => item.wardrobeId).length} items</span></h3><div className="wizard-packing-list">{wardrobe.map((item) => { const selected = packing.some((entry) => entry.wardrobeId === item.id); return <label className={`wizard-packing-row ${selected ? 'included' : ''}`} key={item.id}><input type="checkbox" checked={selected} onChange={() => toggleWardrobePacking(item)} /><img src={item.image || imageFallback} alt="" /><span><strong>{item.name}</strong><small>{item.category}{selected && outfits.some((outfit) => outfit.items.some((piece) => piece.id === item.id)) ? ' · outfit pick' : ''}</small></span><Check size={16} /></label> })}</div></div><div className="wizard-packing-section"><h3>Everyday essentials <span>Change quantity</span></h3><div className="wizard-essentials">{packing.filter((item) => item.category === 'Clothing basics').map((item) => <div className="wizard-essential-row" key={item.id}><span><strong>{item.name}</strong><small>{form.laundry ? 'Laundry planned' : `${days} days`}</small></span><div className="number-stepper"><button aria-label={`Fewer ${item.name}`} onClick={() => updatePackingItem(item.id, (current) => ({ ...current, quantity: Math.max(0, current.quantity - 1) }))}><ArrowDown size={13} /></button><strong>{item.quantity}</strong><button aria-label={`More ${item.name}`} onClick={() => updatePackingItem(item.id, (current) => ({ ...current, quantity: current.quantity + 1 }))}><ArrowUp size={13} /></button></div></div>)}</div></div><div className="preference-toggles wizard-compact-toggles"><ToggleRow title="Rewear clothes" subtitle="Mix and match to pack less." checked={form.reuse} onChange={(checked) => setField('reuse', checked)} /><ToggleRow title="Do laundry on the trip" subtitle="Pack fewer basics." checked={form.laundry} onChange={(checked) => setField('laundry', checked)} /></div></div>}
      {step === 4 && <div className="wizard-step-content"><StepIntro icon={<Shirt size={20} />} eyebrow="STEP 5 · OUTFITS" title="Your outfit ideas." description="Swap pieces or add clothes from your closet." /><div className="preference-block wizard-outfit-count"><div className="preference-label"><strong>Outfit ideas</strong></div><div className="number-stepper"><button aria-label="Fewer outfits" onClick={() => setField('outfitCount', Math.max(1, form.outfitCount - 1))}><ArrowDown size={15} /></button><strong>{form.outfitCount}</strong><button aria-label="More outfits" onClick={() => setField('outfitCount', Math.min(8, form.outfitCount + 1))}><ArrowUp size={15} /></button><span>looks</span></div></div><div className="wizard-outfit-list">{outfits.length ? outfits.map((outfit, outfitIndex) => <article className="wizard-outfit-card" key={outfit.id}><div className="wizard-outfit-heading"><span className="wizard-outfit-badge">LOOK {String(outfitIndex + 1).padStart(2, '0')}</span><strong>{outfit.name}</strong>{outfit.hybrid && <span className="hybrid-badge"><Sparkles size={11} /> HYBRID</span>}</div><p>{outfit.occasion} · {form.weather}</p><div className="wizard-outfit-items">{outfit.items.map((item, itemIndex) => <label className="wizard-outfit-item" key={`${outfit.id}-${item.id}-${itemIndex}`}><img src={item.image || imageFallback} alt="" /><span><strong>{item.name}</strong><small>{item.category}</small></span><select aria-label={`Swap ${item.name}`} value={item.id} onChange={(event) => { const replacement = wardrobe.find((candidate) => candidate.id === event.target.value); if (replacement) updateOutfit(outfitIndex, itemIndex, replacement) }}>{wardrobe.filter((candidate) => candidate.category === item.category).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>)}</div><label className="wizard-add-outfit-item"><Plus size={15} /><span>Add a piece</span><select value="" onChange={(event) => addOutfitItem(outfitIndex, event.target.value)}><option value="">Choose clothes…</option>{wardrobe.filter((candidate) => !outfit.items.some((item) => item.id === candidate.id)).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select></label>{outfit.note && <div className="hybrid-note"><Sparkles size={12} />{outfit.note}</div>}</article>) : <EmptyState title="Add clothes to your closet" description="Then we can suggest outfits for your trip." action={<button className="button button-outline" onClick={() => navigate('/wardrobe')}>Open closet <ArrowRight size={15} /></button>} />}</div></div>}
      {step === 5 && <div className="wizard-step-content"><StepIntro icon={<CheckCircle2 size={20} />} eyebrow="STEP 6 · CHECKLIST" title="Ready for your trip?" description="Check off the essentials. Add anything we missed." /><div className="review-card wizard-final-summary"><div className="review-destination"><span className="review-map"><MapPin size={20} /></span><div><small>YOUR DESTINATION</small><strong>{form.destination || 'Your next trip'}</strong><span>{dateLabel(form.departure, { month: 'long', day: 'numeric', year: 'numeric' })} – {dateLabel(form.returnDate, { month: 'long', day: 'numeric', year: 'numeric' })} <i /> {days} days</span></div><button onClick={() => setStep(0)}>Edit</button></div><div className="review-divider" /><div className="review-facts"><div><span className="review-icon"><LuggageIcon size={15} /></span><small>YOUR BAG</small><strong>{selectedBag?.name ?? 'Choose a bag'}</strong><span>{selectedBag?.type ?? 'Not selected'}</span></div><div><span className="review-icon"><Sun size={15} /></span><small>YOUR PLANS</small><strong>{activities.length} {activities.length === 1 ? 'activity' : 'activities'}</strong><span>{activities.slice(0, 2).join(', ')}{activities.length > 2 ? ` +${activities.length - 2}` : ''}</span></div><div><span className="review-icon"><Sparkles size={15} /></span><small>PACKING PLAN</small><strong>{outfits.length} outfit ideas</strong><span>{packing.length} items · {usage}% bag use</span></div></div></div><div className="wizard-checklist">{checklist.map((item) => <label className={`wizard-check-row ${item.packed ? 'checked' : ''}`} key={item.id}><input type="checkbox" checked={item.packed} onChange={() => setDraftChecklist((current) => (current ?? checklist).map((entry) => entry.id === item.id ? { ...entry, packed: !entry.packed } : entry))} /><span className="wizard-check-icon"><Check size={14} /></span><span><strong>{item.name}</strong><small>{item.category}</small></span></label>)}</div><form className="wizard-add-checklist" onSubmit={addChecklistItem}><Plus size={16} /><input value={customChecklistItem} onChange={(event) => setCustomChecklistItem(event.target.value)} placeholder="Add a reminder" /><button type="submit" disabled={!customChecklistItem.trim()}>Add</button></form>{weatherEstimate && <WeatherSummary estimate={weatherEstimate} category={form.weather} compact />}<div className="demo-notice"><Sparkles size={15} /><span>Demo packing suggestions, matched to your trip.</span></div></div>}
      {error && <div className="form-error"><CircleHelp size={15} />{error}</div>}
      <div className="wizard-actions">{step > 0 ? <button className="button button-outline" onClick={() => { setError(''); setStep((current) => current - 1) }}><ArrowLeft size={16} /> Back</button> : <span className="wizard-lock"><CheckCircle2 size={14} /> Your trip is saved privately</span>}<button className="button button-primary" onClick={next}>{step === 5 ? existing ? 'Finish & save changes' : 'Finish & save trip' : `Next: ${wizardTitles[step + 1]}`}{step === 5 ? <Sparkles size={16} /> : <ArrowRight size={16} />}</button></div>
    </section>
    <div className="wizard-reassurance"><span><Check size={14} /></span> Your wardrobe, plans, and packing list stay on this device.</div>
  </div>
}

function StepIntro({ icon, eyebrow, title, description }: { icon: ReactNode; eyebrow: string; title: string; description: string }) {
  return <div className="step-intro"><span className="step-icon">{icon}</span><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div></div>
}

function WeatherSummary({ estimate, category, compact = false }: { estimate: WeatherEstimate; category: string; compact?: boolean }) {
  const sourceLabel = estimate.source === 'forecast' ? 'DESTINATION FORECAST' : estimate.source === 'climate' ? 'LOCAL CLIMATE HISTORY' : estimate.source === 'fallback' ? 'BROAD SEASONAL ESTIMATE' : 'SEASONAL WEATHER ESTIMATE'
  const sourceTag = estimate.source === 'forecast' ? 'LIVE' : estimate.source === 'climate' ? 'CLIMATE' : 'ESTIMATE'
  const icon = category === 'Rainy' ? <CloudRain size={18} /> : category === 'Warm & sunny' ? <Sun size={18} /> : <CloudSun size={18} />
  return <div className={`weather-summary ${compact ? 'compact' : ''}`}>
    <span className="weather-summary-icon">{icon}</span>
    <div className="weather-summary-main"><div className="weather-summary-kicker">{sourceLabel} <span>{sourceTag}</span></div><strong>{estimate.summary}</strong><small>{estimate.location} · {estimate.coverage} · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data by Open-Meteo</a></small></div>
    <div className="weather-summary-metrics"><span><Thermometer size={14} />{Math.round(estimate.minTemp)}°–{Math.round(estimate.maxTemp)}°C</span><span><CloudRain size={14} />{estimate.rainChance}% rain chance</span></div>
    <div className="weather-summary-category"><small>PACK FOR</small><strong>{category}</strong></div>
    {estimate.note && <p className="weather-summary-note">{estimate.note}</p>}
  </div>
}

function WeatherCard({ estimate, loading }: { estimate: WeatherEstimate | null; loading: boolean }) {
  return <div className="weather-step-card">
    {loading && <div className="weather-loading"><span className="weather-spinner" /> Checking the destination forecast and seasonal outlook…</div>}
    {!loading && estimate && <WeatherSummary estimate={estimate} category={estimate.category} />}
    {!loading && !estimate && <div className="weather-loading"><CloudSun size={18} /> Add your destination and dates to see a weather estimate.</div>}
  </div>
}

function ToggleRow({ title, subtitle, checked, onChange }: { title: string; subtitle: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button className="toggle-row" onClick={() => onChange(!checked)}><span><strong>{title}</strong><small>{subtitle}</small></span><span className={`toggle ${checked ? 'on' : ''}`}><i /></span></button>
}

function TripPlan({ trips, wardrobe, luggage, learning, onLearn, onUpdate, onNavigate, notify }: { trips: Trip[]; wardrobe: Clothing[]; luggage: Luggage[]; learning: LearningProfile; onLearn: (outfit: Outfit, liked: boolean) => void; onUpdate: (tripId: string, updater: (trip: Trip) => Trip) => void; onNavigate: (path: string) => void; notify: (message: string) => void }) {
  const { tripId = '' } = useParams()
  const trip = trips.find((item) => item.id === tripId)
  const [tab, setTab] = useState<'outfits' | 'packing' | 'essentials'>('outfits')
  const [customItem, setCustomItem] = useState('')
  const [ratedOutfits, setRatedOutfits] = useState<Record<string, boolean>>({})
  if (!trip) return <div className="page"><EmptyState title="We can’t find that trip" description="It may have been removed from your saved trips." action={<button className="button button-primary" onClick={() => onNavigate('/saved')}>Go to saved trips <ArrowRight size={15} /></button>} /></div>
  const bag = luggage.find((item) => item.id === trip.luggageId)
  const outfits = trip.outfits?.length ? trip.outfits : recommendOutfits(wardrobe, trip, learning, bag?.capacity)
  const usage = usageEstimate(trip.packing, bag?.capacity ?? 38)
  const totalItems = trip.packing.reduce((total, item) => total + item.quantity, 0)
  const packedCount = trip.packing.filter((item) => item.packed).length + trip.checklist.filter((item) => item.packed).length
  const allCount = trip.packing.length + trip.checklist.length
  const progress = allCount ? Math.round(packedCount / allCount * 100) : 0
  const togglePacking = (id: string) => onUpdate(trip.id, (current) => ({ ...current, packing: current.packing.map((item) => item.id === id ? { ...item, packed: !item.packed } : item) }))
  const toggleChecklist = (id: string) => onUpdate(trip.id, (current) => ({ ...current, checklist: current.checklist.map((item) => item.id === id ? { ...item, packed: !item.packed } : item) }))
  const changeQuantity = (id: string, quantity: number) => onUpdate(trip.id, (current) => ({ ...current, packing: current.packing.map((item) => item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item) }))
  const removePacking = (id: string) => onUpdate(trip.id, (current) => ({ ...current, packing: current.packing.filter((item) => item.id !== id) }))
  const rateOutfit = (outfit: NonNullable<Trip['outfits']>[number], liked: boolean) => {
    if (ratedOutfits[outfit.id] !== undefined) return
    onLearn(outfit, liked)
    setRatedOutfits((current) => ({ ...current, [outfit.id]: liked }))
    notify('Got it — your packing coach will learn from this')
  }
  const replaceOutfit = (index: number) => {
    const currentOutfit = outfits[index]
    const currentIds = new Set(currentOutfit.items.map((item) => item.id))
    const replaceIndex = currentOutfit.items.findIndex((item) => wardrobe.some((candidate) => candidate.category === item.category && !currentIds.has(candidate.id)))
    if (replaceIndex < 0) { notify('Add another piece in this category to make a new combination'); return }
    const oldItem = currentOutfit.items[replaceIndex]
    const replacement = wardrobe.find((item) => item.category === oldItem.category && !currentIds.has(item.id))
    if (!replacement) return
    const newItems = currentOutfit.items.map((item, itemIndex) => itemIndex === replaceIndex ? replacement : item)
    const dress = newItems.find((item) => item.category === 'Dresses')
    const top = newItems.find((item) => ['T-shirts', 'Shirts'].includes(item.category))
    const bottom = newItems.find((item) => ['Trousers', 'Jeans', 'Shorts', 'Skirts'].includes(item.category))
    const updated = [...outfits]
    updated[index] = { ...currentOutfit, id: `${currentOutfit.id}-swap-${Date.now()}`, name: dress?.name ?? `${top?.color ?? 'Easy'} + ${bottom?.color ?? 'everyday'}`, items: newItems }
    const freshPacking = recommendPacking(wardrobe, updated, trip.days, trip.preferences.laundry, trip.weather)
    const previousPacking = new Map(trip.packing.map((item) => [item.id, item]))
    onUpdate(trip.id, (current) => ({ ...current, outfits: updated, packing: freshPacking.map((item) => ({ ...item, packed: previousPacking.get(item.id)?.packed ?? false })) }))
    notify('Outfit swapped for another wardrobe combination')
  }
  const addChecklist = (event: FormEvent) => {
    event.preventDefault()
    if (!customItem.trim()) return
    onUpdate(trip.id, (current) => ({ ...current, checklist: [...current.checklist, { id: `custom-${Date.now()}`, name: customItem.trim(), category: 'Your additions', quantity: 1, packed: false }] }))
    setCustomItem('')
  }
  const categorized = useMemo(() => {
    const groups = new Map<string, PackingItem[]>()
    trip.packing.forEach((item) => groups.set(item.category, [...(groups.get(item.category) ?? []), item]))
    return [...groups.entries()]
  }, [trip.packing])

  return <div className="page plan-page">
    <button className="back-link" onClick={() => onNavigate('/saved')}><ArrowLeft size={16} /> All saved trips</button>
    <div className="plan-title-row"><div><div className="eyebrow">YOUR THOUGHTFUL PACKING PLAN</div><h1>{trip.destination}<span className="plan-title-pin"><MapPin size={17} /></span></h1><div className="plan-meta"><span><CalendarDays size={15} />{dateLabel(trip.departure)} – {dateLabel(trip.returnDate)}</span><i /> {trip.days} days <i /> {trip.activities.length} plans</div></div><div className="plan-actions"><button className="button button-outline" onClick={() => onNavigate(`/create-trip?edit=${trip.id}`)}><Ellipsis size={17} /> Edit trip</button><button className="button button-primary" onClick={() => window.print()}><ArrowDown size={16} /> Print list</button></div></div>
    <div className="plan-summary-strip"><div className="selected-bag"><img src={bag?.image || imageFallback} alt="" /><div><small>TRAVELLING WITH</small><strong>{bag?.name ?? 'Your luggage'}</strong><span>{bag?.type ?? ''} {bag ? `· ${bag.capacity}L` : ''}</span></div></div><div className="plan-strip-divider" /><div className="progress-summary"><div><small>PACKING PROGRESS</small><strong>{progress}% <span>ready to go</span></strong></div><div className="wide-progress"><span style={{ width: `${progress}%` }} /></div><small>{packedCount} of {allCount} items checked off</small></div><div className="capacity-summary"><small>ESTIMATED BAG USAGE</small><strong>{usage}<span>%</span></strong><div className="mini-progress"><span style={{ width: `${usage}%` }} /></div><small>Approximate, based on your list</small></div></div>
    {trip.weatherEstimate && <WeatherSummary estimate={trip.weatherEstimate} category={trip.weather} compact />}
    <div className="plan-callout"><span className="callout-spark"><Sparkles size={16} /></span><span><strong>A little thought goes a long way.</strong> We’ve matched your wardrobe to the {trip.weather.toLowerCase()} outlook, {trip.days} days away, {trip.activities.length ? trip.activities.slice(0, 2).join(' & ').toLowerCase() : 'and your plans'}.</span><span className="demo-tag">PACKING PLAN</span></div>
    <div className="plan-tabs">{([{ id: 'outfits', label: 'Outfit ideas', count: outfits.length }, { id: 'packing', label: 'What to pack', count: totalItems }, { id: 'essentials', label: 'Don’t forget', count: trip.checklist.length }] as const).map(({ id, label, count }) => <button key={id} className={tab === id ? 'selected' : ''} onClick={() => setTab(id)}>{label}<span>{count}</span></button>)}</div>
    {tab === 'outfits' && <section className="plan-section"><div className="section-heading"><div><div className="eyebrow">MADE FROM YOUR WARDROBE</div><h2>Looks to take you places</h2></div><span className="section-caption">{outfits.length} outfit ideas</span></div><div className="learning-banner"><span><Sparkles size={17} /></span><div><strong>Your packing coach is learning</strong><small>Tap a thumbs-up or down. Your next trip gets more personal.</small></div><b>{learning.feedbackCount} ratings</b></div><div className="outfit-grid">{outfits.map((outfit, index) => <article className="outfit-card" key={outfit.id}><div className="outfit-card-top"><span className="day-label">LOOK {String(index + 1).padStart(2, '0')}</span><button className="more-button" aria-label="Replace outfit" title="Replace outfit" onClick={() => replaceOutfit(index)}><ArrowUpRight size={17} /></button></div><div className="outfit-photos">{outfit.items.slice(0, 3).map((item) => <img src={item.image || imageFallback} alt={item.name} key={item.id} />)}</div><div className="outfit-card-copy"><div className="outfit-badges"><span className="occasion-badge">{activityIcon[outfit.occasion] ?? '✦'} {outfit.occasion}</span>{outfit.hybrid && <span className="hybrid-badge"><Sparkles size={11} /> HYBRID</span>}</div><h3>{outfit.name}</h3>{outfit.items.map((item) => <p key={item.id}><span>{item.name}</span><small>{item.color}</small></p>)}{outfit.note && <div className="hybrid-note">{outfit.note}</div>}{outfit.reason && <div className="ai-reason"><Sparkles size={12} />{outfit.reason}</div>}<div className="outfit-feedback"><span>{ratedOutfits[outfit.id] === undefined ? 'Would you wear this?' : ratedOutfits[outfit.id] ? 'We’ll remember that' : 'We’ll adjust next time'}</span><button className={ratedOutfits[outfit.id] === true ? 'selected' : ''} disabled={ratedOutfits[outfit.id] !== undefined} aria-label="I like this outfit" onClick={() => rateOutfit(outfit, true)}><ThumbsUp size={15} /></button><button className={ratedOutfits[outfit.id] === false ? 'selected' : ''} disabled={ratedOutfits[outfit.id] !== undefined} aria-label="I don’t like this outfit" onClick={() => rateOutfit(outfit, false)}><ThumbsDown size={15} /></button></div><button className="swap-link" onClick={() => replaceOutfit(index)}><ArrowRight size={13} /> Try another combination</button></div></article>)}</div><div className="outfit-tip"><Sparkles size={15} /><span><strong>The clever bit:</strong> feedback trains your on-device preference model for future outfit ideas.</span></div></section>}
    {tab === 'packing' && <section className="plan-section packing-section"><div className="section-heading"><div><div className="eyebrow">YOUR EDITED, CHECKABLE LIST</div><h2>Everything worth bringing</h2></div><span className="section-caption">{totalItems} total pieces</span></div><div className="packing-layout"><div className="packing-groups">{categorized.length ? categorized.map(([category, items]) => <div className="packing-group" key={category}><div className="packing-group-heading"><span>{category}</span><small>{items.length} {items.length === 1 ? 'item' : 'items'}</small></div>{items.map((item) => <PackingRow key={item.id} item={item} onToggle={() => togglePacking(item.id)} onQuantity={(amount) => changeQuantity(item.id, item.quantity + amount)} onRemove={() => removePacking(item.id)} />)}</div>) : <div className="empty-inline">Your packing list is clear. Add pieces from the wardrobe to get started.</div>}</div><aside className="underwear-card"><span className="underwear-icon"><Heart size={18} /></span><div className="eyebrow">THE EVERYDAY EXTRAS</div><h3>Small things,<br />big difference.</h3><p>Basics are estimated for {trip.days} days{trip.preferences.laundry ? ', with laundry in mind' : ''}. Adjust anything to suit your trip.</p><div className="basics-list">{trip.packing.filter((item) => item.category === 'Clothing basics').map((item) => <PackingRow compact key={item.id} item={item} onToggle={() => togglePacking(item.id)} onQuantity={(amount) => changeQuantity(item.id, item.quantity + amount)} />)}</div><small className="estimate-note"><CloudSun size={13} /> Helpful estimates, not hard rules</small></aside></div></section>}
    {tab === 'essentials' && <section className="plan-section essentials-section"><div className="section-heading"><div><div className="eyebrow">THE THINGS THAT MATTER MOST</div><h2>Don’t leave without these</h2></div><span className="section-caption">{trip.checklist.filter((item) => item.packed).length} of {trip.checklist.length} ready</span></div><div className="essentials-layout"><div className="essentials-card"><div className="essentials-heading"><span className="essentials-heading-icon"><FileCheck2 size={18} /></span><div><strong>The important things</strong><small>Travel essentials, all in one place</small></div></div>{trip.checklist.map((item) => <PackingRow key={item.id} item={item} onToggle={() => toggleChecklist(item.id)} />)}<form className="add-checklist-form" onSubmit={addChecklist}><Plus size={16} /><input value={customItem} onChange={(event) => setCustomItem(event.target.value)} placeholder="Add something to remember..." /><button type="submit" disabled={!customItem.trim()}>Add</button></form></div><div className="before-you-go"><div className="before-art"><img src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=85" alt="" /><span><Sun size={18} /></span></div><div className="eyebrow">A GENTLE REMINDER</div><h3>Leave a little room<br />for the good stuff.</h3><p>Your packing plan is a guide, not a rulebook. Make it yours, then go make some memories.</p><span className="before-signoff">With care, SuitcaseAI <Heart size={13} /></span></div></div></section>}
    <div className="plan-footer-note"><span><Sparkles size={14} /></span> Recommendations are demo suggestions based on your wardrobe and trip details.</div>
  </div>
}

function PackingRow({ item, onToggle, onQuantity, onRemove, compact = false }: { item: PackingItem; onToggle: () => void; onQuantity?: (amount: number) => void; onRemove?: () => void; compact?: boolean }) {
  return <div className={`packing-row ${item.packed ? 'is-packed' : ''} ${compact ? 'compact' : ''}`}><button className={`check-box ${item.packed ? 'checked' : ''}`} onClick={onToggle} aria-label={item.packed ? `Uncheck ${item.name}` : `Check ${item.name}`}>{item.packed && <Check size={12} />}</button><span className="packing-name">{item.name}</span>{onQuantity && <div className="quantity-control"><button aria-label={`Remove one ${item.name}`} onClick={() => onQuantity(-1)} disabled={item.quantity <= 1}>−</button><strong>{item.quantity}</strong><button aria-label={`Add one ${item.name}`} onClick={() => onQuantity(1)}>+</button></div>}{onRemove && <button className="remove-packing" aria-label={`Remove ${item.name}`} onClick={onRemove}><X size={14} /></button>}</div>
}

function PageTitle({ eyebrow, title, subtitle, action }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode }) {
  return <div className="page-title-row"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon"><Compass size={23} /></span><h2>{title}</h2><p>{description}</p>{action}</div>
}

function inferImageColor(source: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 48
        canvas.height = 48
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('Image color analysis is not supported in this browser')
        const side = Math.min(image.naturalWidth, image.naturalHeight)
        const left = (image.naturalWidth - side) / 2
        const top = (image.naturalHeight - side) / 2
        context.drawImage(image, left, top, side, side, 0, 0, 48, 48)
        const pixels = context.getImageData(0, 0, 48, 48).data
        const counts = new Map<string, number>()
        for (let index = 0; index < pixels.length; index += 16) {
          const red = pixels[index]
          const green = pixels[index + 1]
          const blue = pixels[index + 2]
          const max = Math.max(red, green, blue)
          const min = Math.min(red, green, blue)
          const spread = max - min
          let color: string
          if (max < 48) color = 'Black'
          else if (spread < 23) color = max > 205 ? 'White' : 'Gray'
          else {
            const hue = red === max
              ? (green - blue) / spread
              : green === max ? 2 + (blue - red) / spread : 4 + (red - green) / spread
            const degrees = (hue * 60 + 360) % 360
            if (max < 145 && degrees >= 10 && degrees < 45) color = 'Brown'
            else if (degrees < 15 || degrees >= 345) color = 'Red'
            else if (degrees < 42) color = max > 180 && green > 100 ? 'Orange' : 'Brown'
            else if (degrees < 70) color = 'Yellow'
            else if (degrees < 165) color = 'Green'
            else if (degrees < 255) color = 'Blue'
            else if (degrees < 295) color = 'Purple'
            else color = 'Pink'
          }
          counts.set(color, (counts.get(color) ?? 0) + 1)
        }
        resolve([...counts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? 'Mixed')
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('The image could not be analyzed'))
    image.src = source
  })
}

function ClothingModal({ item, onClose, onSave }: { item: Clothing | null; onClose: () => void; onSave: (item: Clothing) => void }) {
  const [form, setForm] = useState<Clothing>(item ?? { id: `clothing-${Date.now()}`, name: '', category: 'T-shirts', color: 'Neutral', image: '' })
  const [colorStatus, setColorStatus] = useState('')
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const source = String(reader.result)
      setForm((current) => ({ ...current, image: source }))
      setColorStatus('Reading photo colors…')
      inferImageColor(source).then((color) => {
        setForm((current) => ({ ...current, color }))
        setColorStatus(`Photo color detected: ${color}`)
      }).catch(() => setColorStatus('Photo saved. Color detection was unavailable in this browser.'))
    }
    reader.onerror = () => setColorStatus('Could not read that photo. Try a different image.')
    reader.readAsDataURL(file)
  }
  return <ModalFrame title={item ? 'Edit this piece' : 'Add to your wardrobe'} onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave({ id: form.id, name: form.name.trim(), category: form.category, color: form.color || 'Neutral', image: form.image }) }}><label className="upload-zone clothing-upload">{form.image ? <img src={form.image} alt="Clothing preview" /> : <><span><Upload size={19} /></span><strong>Add a photo</strong><small>We’ll match it to your trip automatically</small></>}<input type="file" accept="image/*" onChange={upload} /></label>{colorStatus && <div className="photo-color-status"><Sparkles size={13} />{colorStatus}</div>}<label>What do you call it?<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Blue linen shirt" required autoFocus /></label><label>Clothing type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><div className="auto-match-note"><Sparkles size={16} /><span><strong>No style or activity tags.</strong> SuitcaseAI matches pieces to your trip, weather, and feedback.</span></div><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{item ? 'Save changes' : 'Add piece'} <ArrowRight size={15} /></button></div></form></ModalFrame>
}

function LuggageModal({ item, onClose, onSave }: { item: Luggage | null; onClose: () => void; onSave: (item: Luggage) => void }) {
  const [form, setForm] = useState<Luggage>(item ?? { id: `luggage-${Date.now()}`, name: '', type: 'Cabin suitcase', capacity: 38, dimensions: '', image: '' })
  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, image: String(reader.result) }))
    reader.onerror = () => window.alert('This image could not be loaded. Please try another file.')
    reader.readAsDataURL(file)
  }
  return <ModalFrame title={item ? 'Edit your luggage' : 'Add a bag'} onClose={onClose}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); onSave(form) }}><label className="upload-zone luggage-upload">{form.image ? <img src={form.image} alt="Luggage preview" /> : <><span><Upload size={19} /></span><strong>Add a bag photo</strong><small>Optional — make it easy to recognize</small></>}<input type="file" accept="image/*" onChange={upload} /></label><label>Give your bag a name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. The Weekender" required autoFocus /></label><div className="modal-form-row"><label>Bag type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Personal item</option><option>Cabin suitcase</option><option>Medium suitcase</option><option>Large suitcase</option></select></label><label>Capacity (litres)<input type="number" min="1" max="200" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} required /></label></div><label>Dimensions <span className="optional-label">optional</span><input value={form.dimensions} onChange={(event) => setForm({ ...form, dimensions: event.target.value })} placeholder="e.g. 55 × 35 × 23 cm" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{item ? 'Save changes' : 'Save bag'} <ArrowRight size={15} /></button></div></form></ModalFrame>
}

function ModalFrame({ children, title, onClose }: { children: ReactNode; title: string; onClose: () => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="modal-panel"><div className="modal-heading"><div><div className="eyebrow">A LITTLE MORE YOU</div><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>{children}</section></div>
}

export default App
