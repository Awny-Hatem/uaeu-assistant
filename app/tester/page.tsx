import { notFound } from 'next/navigation';
import { testerEnabled } from '@/lib/tester/gate';
import TesterWorkbench from './workbench';
export const dynamic = 'force-dynamic';
export default function TesterPage() { if (!testerEnabled())
  notFound(); return <TesterWorkbench />; }
