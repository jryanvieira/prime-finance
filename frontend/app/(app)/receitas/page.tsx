import { redirect } from 'next/navigation'

export default function ReceitasPage() {
  redirect('/transacoes?tipo=entrada')
}
