import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Agents from './pages/Agents'
import Docs from './pages/Docs'
import HowItWorks from './pages/HowItWorks'
import Ops from './pages/Ops'
import Vaults from './pages/Vaults'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Vaults />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<Docs />} />
          <Route path="/ops" element={<Ops />} />
          <Route path="*" element={<Vaults />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
