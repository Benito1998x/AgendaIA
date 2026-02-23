import { useEffect } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import { Header } from "@/components/Header";
import { TaskInput } from "@/components/TaskInput";
import { TaskList } from "@/components/TaskList";
import { PomodoroBar } from "@/components/PomodoroBar";
import { StatsPanel } from "@/components/StatsPanel";

const Index = () => {
  const { fetchAgenda, currentDate } = useAgendaStore();

  useEffect(() => {
    fetchAgenda();
  }, [currentDate, fetchAgenda]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto lg:mr-auto lg:ml-[calc(50%-24rem)]">
        <Header />
        <TaskInput />
        <TaskList />
      </div>

      {/* Stats sidebar - desktop only */}
      <div className="hidden lg:block fixed top-4 right-4 w-72">
        <StatsPanel />
      </div>

      <PomodoroBar />
    </div>
  );
};

export default Index;
