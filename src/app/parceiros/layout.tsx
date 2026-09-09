import type { Metadata } from 'next'

const TITLE = 'Programa de Parceiros SST | Sublime SST'
const DESCRIPTION = 'Conheça as condições do programa de parceiros da Sublime SST, encaminhe clientes e cadastre sua empresa para acompanhar as indicações.'
const URL = 'https://www.sublimesst.com/parceiros'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: URL },
}

export default function ParceirosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
