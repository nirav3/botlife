import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Dumbbell, X } from 'lucide-react';
import { workoutsApi } from '@/api/workouts';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';

export default function WorkoutsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workouts'],
    queryFn: () => workoutsApi.list({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => workoutsApi.create({ name, notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Session created!');
      setModalOpen(false);
      setName('');
      setNotes('');
    },
    onError: () => toast.error('Failed to create session'),
  });

  const deleteMutation = useMutation({
    mutationFn: workoutsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workouts'] });
      toast.success('Session deleted');
    },
    onError: () => toast.error('Failed to delete session'),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Enter a session name'); return; }
    createMutation.mutate();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-accent-violet" /> Workouts
        </h1>
        <Button onClick={() => setModalOpen(true)}>+ New session</Button>
      </div>

      {isLoading && <p className="text-muted text-sm">Loading...</p>}

      {data?.data.length === 0 && (
        <div className="text-center py-16 text-muted">
          <Dumbbell className="w-10 h-10 mx-auto mb-3" />
          <p className="font-medium">No workout sessions yet</p>
          <p className="text-sm mt-1">Create your first session to get started</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.data.map((session) => {
          const totalSets = session.exerciseLogs.reduce((acc, log) => acc + log.sets.length, 0);
          const duration =
            session.endedAt
              ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
              : null;

          return (
            <Card key={session.id}>
              <CardBody className="flex items-center justify-between">
                <Link to={`/workouts/${session.id}`} className="flex-1 min-w-0">
                  <p className="font-semibold text-ink hover:text-accent-violet transition-colors">
                    {session.name}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-muted">
                    <span>{format(new Date(session.startedAt), 'MMM d, yyyy · h:mm a')}</span>
                    <span>{session.exerciseLogs.length} exercises</span>
                    <span>{totalSets} sets</span>
                    {duration && <span>{duration} min</span>}
                  </div>
                </Link>
                <button
                  onClick={() => deleteMutation.mutate(session.id)}
                  className="text-danger/70 hover:text-danger ml-4 transition-colors shrink-0"
                  aria-label="Delete session"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New workout session">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Session name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push Day, Leg Day…"
            required
            autoFocus
          />
          <Input
            label="Notes (optional)"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Feeling strong today"
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
