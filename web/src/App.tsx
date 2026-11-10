import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import AgentPage from './pages/AgentPage'
import CircuitAgentPage from './pages/CircuitAgentPage'
import RotatorPage from './pages/RotatorPage'
import NeutralPage from './pages/NeutralPage'
import Linked from './pages/Linked'
import Agents from './pages/Agents'
import Docs from './pages/Docs'
import Home from './pages/Home'
import HowItWorks from './pages/HowItWorks'
import LaunchAgent from './pages/LaunchAgent'
import Ops from './pages/Ops'
import Portfolio from './pages/Portfolio'
import Vaults from './pages/Vaults'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/vaults" element={<Vaults />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/launch" element={<LaunchAgent />} />
          <Route path="/agents/orphic-rotator" element={<RotatorPage />} />
          <Route path="/agents/orphic-neutral" element={<NeutralPage />} />
          <Route path="/linked" element={<Linked />} />
          <Route path="/agents/c/:id" element={<CircuitAgentPage />} />
          <Route path="/agents/:slug" element={<AgentPage />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:slug" element={<Docs />} />
          <Route path="/ops" element={<Ops />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
