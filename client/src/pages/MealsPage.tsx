import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Salad, X } from 'lucide-react';
import { mealsApi } from '@/api/meals';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { MealPlan, Meal } from '@/types';
import toast from 'react-hot-toast';

export default function MealsPage() {
  const qc = useQueryClient();

  // Today's summary
  const { data: summary } = useQuery({ queryKey: ['daily-summary'], queryFn: () => mealsApi.dailySummary() });

  // All plans (to find active one)
  const { data: plans } = useQuery({ queryKey: ['meal-plans'], queryFn: mealsApi.list });

  const activePlan = plans?.find((p) => p.isActive) ?? plans?.[0];

  // Modals state
  const [newPlanModal, setNewPlanModal] = useState(false);
  const [newMealModal, setNewMealModal] = useState(false);
  const [addFoodModal, setAddFoodModal] = useState<{ planId: string; mealId: string } | null>(null);

  // New plan form
  const [planName, setPlanName] = useState('');
  const [targetCal, setTargetCal] = useState('');
  const [targetPro, setTargetPro] = useState('');
  const [targetCarb, setTargetCarb] = useState('');
  const [targetFat, setTargetFat] = useState('');

  // New meal form
  const [mealName, setMealName] = useState('');

  // Food item form
  const [foodName, setFoodName] = useState('');
  const [foodQty, setFoodQty] = useState('');
  const [foodUnit, setFoodUnit] = useState('g');
  const [foodCal, setFoodCal] = useState('');
  const [foodPro, setFoodPro] = useState('');
  const [foodCarb, setFoodCarb] = useState('');
  const [foodFat, setFoodFat] = useState('');

  const createPlanMutation = useMutation({
    mutationFn: () => mealsApi.create({
      name: planName,
      targetCalories: targetCal ? parseInt(targetCal) : undefined,
      targetProteinG: targetPro ? parseInt(targetPro) : undefined,
      targetCarbsG: targetCarb ? parseInt(targetCarb) : undefined,
      targetFatG: targetFat ? parseInt(targetFat) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans'] });
      toast.success('Meal plan created');
      setNewPlanModal(false);
      setPlanName(''); setTargetCal(''); setTargetPro(''); setTargetCarb(''); setTargetFat('');
    },
  });

  const addMealMutation = useMutation({
    mutationFn: () => mealsApi.addMeal(activePlan!.id, { name: mealName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      toast.success('Meal added');
      setNewMealModal(false);
      setMealName('');
    },
  });

  const addFoodMutation = useMutation({
    mutationFn: () =>
      mealsApi.addFood(addFoodModal!.planId, addFoodModal!.mealId, {
        name: foodName,
        quantity: parseFloat(foodQty),
        unit: foodUnit,
        calories: parseFloat(foodCal),
        proteinG: foodPro ? parseFloat(foodPro) : 0,
        carbsG: foodCarb ? parseFloat(foodCarb) : 0,
        fatG: foodFat ? parseFloat(foodFat) : 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      toast.success('Food added');
      setAddFoodModal(null);
      setFoodName(''); setFoodQty(''); setFoodUnit('g'); setFoodCal(''); setFoodPro(''); setFoodCarb(''); setFoodFat('');
    },
  });

  const deleteFoodMutation = useMutation({
    mutationFn: ({ planId, mealId, foodId }: { planId: string; mealId: string; foodId: string }) =>
      mealsApi.deleteFood(planId, mealId, foodId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meal-plans'] });
      qc.invalidateQueries({ queryKey: ['daily-summary'] });
      toast.success('Food removed');
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink flex items-center gap-2">
          <Salad className="w-6 h-6 text-accent-lime" /> Meals
        </h1>
        <div className="flex gap-2">
          {activePlan && (
            <Button variant="secondary" onClick={() => setNewMealModal(true)}>+ Add meal</Button>
          )}
          <Button onClick={() => setNewPlanModal(true)}>+ New plan</Button>
        </div>
      </div>

      {/* Daily summary */}
      {summary && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-ink">Today — {format(new Date(), 'MMM d')}</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {([
                { label: 'Calories', value: Math.round(summary.totals.calories), target: summary.targets?.calories, unit: 'kcal', color: 'text-accent-coral' },
                { label: 'Protein', value: Math.round(summary.totals.proteinG), target: summary.targets?.proteinG, unit: 'g', color: 'text-accent-cyan' },
                { label: 'Carbs', value: Math.round(summary.totals.carbsG), target: summary.targets?.carbsG, unit: 'g', color: 'text-accent-lime' },
                { label: 'Fat', value: Math.round(summary.totals.fatG), target: summary.targets?.fatG, unit: 'g', color: 'text-accent-coral' },
              ] as const).map(({ label, value, target, unit, color }) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className={`text-xl font-extrabold ${color}`}>{value}<span className="text-xs font-normal text-muted ml-0.5">{unit}</span></p>
                  {target && <p className="text-xs text-muted mt-0.5">/ {target}{unit}</p>}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Active plan meals */}
      {activePlan && <PlanView plan={activePlan} onAddFood={(mealId) => setAddFoodModal({ planId: activePlan.id, mealId })} onDeleteFood={(mealId, foodId) => deleteFoodMutation.mutate({ planId: activePlan.id, mealId, foodId })} />}

      {!plans?.length && (
        <div className="text-center py-16 text-muted">
          <Salad className="w-10 h-10 mx-auto mb-3" />
          <p className="font-medium">No meal plans yet</p>
          <p className="text-sm mt-1">Create a plan to start tracking nutrition</p>
        </div>
      )}

      {/* New plan modal */}
      <Modal open={newPlanModal} onClose={() => setNewPlanModal(false)} title="New meal plan">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); createPlanMutation.mutate(); }} className="space-y-4">
          <Input label="Plan name" value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder="Lean Bulk" required autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Target calories" type="number" value={targetCal} onChange={(e) => setTargetCal(e.target.value)} placeholder="2800" />
            <Input label="Protein (g)" type="number" value={targetPro} onChange={(e) => setTargetPro(e.target.value)} placeholder="200" />
            <Input label="Carbs (g)" type="number" value={targetCarb} onChange={(e) => setTargetCarb(e.target.value)} placeholder="300" />
            <Input label="Fat (g)" type="number" value={targetFat} onChange={(e) => setTargetFat(e.target.value)} placeholder="80" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setNewPlanModal(false)}>Cancel</Button>
            <Button type="submit" loading={createPlanMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Add meal modal */}
      <Modal open={newMealModal} onClose={() => setNewMealModal(false)} title="Add meal">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); addMealMutation.mutate(); }} className="space-y-4">
          <Input label="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Breakfast, Lunch, Pre-workout…" required autoFocus />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setNewMealModal(false)}>Cancel</Button>
            <Button type="submit" loading={addMealMutation.isPending}>Add</Button>
          </div>
        </form>
      </Modal>

      {/* Add food modal */}
      <Modal open={!!addFoodModal} onClose={() => setAddFoodModal(null)} title="Add food item">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); addFoodMutation.mutate(); }} className="space-y-4">
          <Input label="Food name" value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Chicken Breast" required autoFocus />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" step="0.1" value={foodQty} onChange={(e) => setFoodQty(e.target.value)} placeholder="200" required />
            <Input label="Unit" value={foodUnit} onChange={(e) => setFoodUnit(e.target.value)} placeholder="g" required />
          </div>
          <Input label="Calories" type="number" step="0.1" value={foodCal} onChange={(e) => setFoodCal(e.target.value)} placeholder="330" required />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" step="0.1" value={foodPro} onChange={(e) => setFoodPro(e.target.value)} placeholder="62" />
            <Input label="Carbs (g)" type="number" step="0.1" value={foodCarb} onChange={(e) => setFoodCarb(e.target.value)} placeholder="0" />
            <Input label="Fat (g)" type="number" step="0.1" value={foodFat} onChange={(e) => setFoodFat(e.target.value)} placeholder="7" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddFoodModal(null)}>Cancel</Button>
            <Button type="submit" loading={addFoodMutation.isPending}>Add</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PlanView({ plan, onAddFood, onDeleteFood }: {
  plan: MealPlan;
  onAddFood: (mealId: string) => void;
  onDeleteFood: (mealId: string, foodId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-ink text-sm uppercase tracking-wide">{plan.name}</h2>
      {plan.meals.length === 0 && (
        <p className="text-sm text-muted text-center py-6">No meals logged yet — add one above</p>
      )}
      {plan.meals.map((meal: Meal) => {
        const mealCal = meal.foodItems.reduce((a, f) => a + f.calories, 0);
        const mealPro = meal.foodItems.reduce((a, f) => a + f.proteinG, 0);
        return (
          <Card key={meal.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{meal.name}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {Math.round(mealCal)} kcal · {Math.round(mealPro)}g protein
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onAddFood(meal.id)}>+ Food</Button>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {meal.foodItems.length === 0 && (
                <p className="text-xs text-muted px-6 py-3">No food logged</p>
              )}
              {meal.foodItems.map((food) => (
                <div key={food.id} className="flex items-center justify-between px-6 py-2.5 border-b last:border-b-0 border-line">
                  <div>
                    <p className="text-sm font-medium text-ink">{food.name}</p>
                    <p className="text-xs text-muted">{food.quantity}{food.unit} · P:{food.proteinG}g C:{food.carbsG}g F:{food.fatG}g</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-sm font-semibold text-ink">{Math.round(food.calories)} kcal</span>
                    <button onClick={() => onDeleteFood(meal.id, food.id)} className="text-danger/50 hover:text-danger transition-colors" aria-label="Delete food"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
