import { redirect } from 'next/navigation';

// La entrada de la app es el tablero de oportunidades, que tiene el acceso a
// la cuenta; la vista de tabla sigue disponible en /dashboard.
export default function Home() {
  redirect('/insights');
}
