import CpfDashboard from '@/components/CpfDashboard';
import BackHomeButton from '@/components/BackHomeButton';
import DashboardSizeNotice from '@/components/DashboardSizeNotice';

export default function Page() {
  return (
    <>
      <BackHomeButton />
      <CpfDashboard />
      <DashboardSizeNotice />
    </>
  );
}
