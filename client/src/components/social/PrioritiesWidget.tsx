import React, { useState } from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface Priority {
  id: number;
  text: string;
  completed: boolean;
  date?: string;
}

const PrioritiesWidget: React.FC = () => {
  const [priorities, setPriorities] = useState<Priority[]>([
    {
      id: 1,
      text: 'Camping trip for the department',
      completed: false,
      date: '1 week old',
    },
  ]);

  const [newPriority, setNewPriority] = useState('');

  const handleTogglePriority = (id: number) => {
    setPriorities(
      priorities.map((priority) =>
        priority.id === id
          ? { ...priority, completed: !priority.completed }
          : priority
      )
    );
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      setPriorities([
        ...priorities,
        {
          id: Date.now(),
          text: newPriority.trim(),
          completed: false,
          date: 'Just now',
        },
      ]);
      setNewPriority('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPriority();
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      <div className="p-4">
        <h2 className="font-bold text-gray-800 mb-3">Priorities</h2>

        {/* Priority list */}
        <div className="space-y-3 mb-4">
          {priorities.map((priority) => (
            <div key={priority.id} className="flex items-start group">
              <button className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity">
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 flex items-start">
                <Checkbox
                  id={`priority-${priority.id}`}
                  checked={priority.completed}
                  onCheckedChange={() => handleTogglePriority(priority.id)}
                  className="mt-1 mr-2"
                />
                <div className="flex-1">
                  <label
                    htmlFor={`priority-${priority.id}`}
                    className={`text-sm ${priority.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}
                  >
                    {priority.text}
                  </label>
                  {priority.date && (
                    <div className="text-xs text-gray-400">{priority.date}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add new priority */}
        <div className="flex items-center">
          <button
            className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 mr-2 hover:bg-gray-100"
            onClick={handleAddPriority}
          >
            <Plus className="h-4 w-4" />
          </button>
          <input
            type="text"
            placeholder="Click here to add a new priority..."
            className="flex-1 text-sm text-gray-700 focus:outline-none"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
      </div>
    </div>
  );
};

export default PrioritiesWidget;
