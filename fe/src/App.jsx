import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Catalogo from '@/pages/Catalogo'
import Banco from '@/pages/Banco'
import DaLeggere from '@/pages/DaLeggere'
import Prestiti from '@/pages/Prestiti'
import Libro from '@/pages/Libro'
import Accedi from '@/pages/Accedi'
import Registrati from '@/pages/Registrati'
import Profilo from '@/pages/Profilo'
import Amministrazione from '@/pages/Amministrazione'
import NonTrovata from '@/pages/NonTrovata'

// Senza, cambiando pagina si resta alla stessa altezza di scroll: si arriva
// sul catalogo gia' a meta' pagina.
function RiportaSu() {
  const { pathname } = useLocation()
  useEffect(() => window.scrollTo(0, 0), [pathname])
  return null
}

export default function App() {
  return (
    <>
      <RiportaSu />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="libro/:id" element={<Libro />} />
          <Route path="banco" element={<Banco />} />
          <Route path="da-leggere" element={<DaLeggere />} />
          <Route path="prestiti" element={<Prestiti />} />
          <Route path="accedi" element={<Accedi />} />
          <Route path="registrati" element={<Registrati />} />
          <Route path="profilo" element={<Profilo />} />
          <Route path="amministrazione" element={<Amministrazione />} />
          <Route path="*" element={<NonTrovata />} />
        </Route>
      </Routes>
    </>
  )
}
