import { useState } from 'react';
import {
  CheckCircle2,
  Star,
  Circle,
  CheckSquare,
  SlidersHorizontal,
  FileText,
  Upload,
  Calendar,
  BarChart3,
  Check as CheckIcon,
  ArrowDownUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

interface QuestionPreviewProps {
  question: {
    id: string;
    questionText: string;
    questionType: string;
    isRequired: boolean;
    options?: string[];
  };
  readOnly?: boolean;
}

export default function QuestionPreview({
  question,
  readOnly = true,
}: QuestionPreviewProps) {
  // State for interactive previews when not readOnly
  const [value, setValue] = useState<any>(null);
  const [multiValues, setMultiValues] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [starValue, setStarValue] = useState(0);

  const handleCheckboxChange = (option: string) => {
    setMultiValues((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const renderQuestion = () => {
    switch (question.questionType) {
      case 'nps':
        return (
          <div className="w-full">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                let bgColor = 'bg-red-500';
                if (n >= 7 && n <= 8) bgColor = 'bg-yellow-400';
                if (n >= 9) bgColor = 'bg-green-500';

                return (
                  <button
                    key={n}
                    className={`flex-1 text-white font-medium ${bgColor} rounded-md py-2 px-1 hover:opacity-90 transition-opacity`}
                    onClick={() => !readOnly && setValue(n)}
                    disabled={readOnly}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-xs mt-2">
              <span>Not Likely</span>
              <span>Very Likely</span>
            </div>
          </div>
        );

      case 'single':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                  {index === 0 ? (
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  ) : null}
                </div>
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );

      case 'multiple':
        return (
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded border inline-flex items-center justify-center">
                  {index === 0 || index === 2 ? (
                    <CheckIcon className="h-3 w-3 text-blue-500" />
                  ) : null}
                </div>
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );

      case 'rating':
      case 'scale':
        return (
          <div className="w-full">
            <div className="flex justify-between mb-1 text-xs text-gray-500">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className={`flex-1 border rounded-md py-2 hover:bg-gray-100 ${
                    !readOnly && value === n
                      ? 'bg-blue-100 border-blue-400'
                      : ''
                  }`}
                  onClick={() => !readOnly && setValue(n)}
                  disabled={readOnly}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        );

      case 'likert':
        return (
          <div className="space-y-1">
            {[
              'Strongly Disagree',
              'Disagree',
              'Neutral',
              'Agree',
              'Strongly Agree',
            ].map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                  {index === 3 ? (
                    <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                  ) : null}
                </div>
                <label className="text-sm">{option}</label>
              </div>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <select
            className="w-full border p-2 rounded-md"
            value={value || ''}
            onChange={(e) => !readOnly && setValue(e.target.value)}
            disabled={readOnly}
          >
            <option value="" disabled>
              Select an option
            </option>
            {question.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'ranking': {
        const defaultItems = ['Option 1', 'Option 2', 'Option 3'];
        const rankingItems = question.options?.length
          ? question.options
          : defaultItems;

        return (
          <div className="space-y-2">
            {rankingItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-md bg-white shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-sm font-medium">
                    {index + 1}
                  </span>
                  <span className="text-sm">{item}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={readOnly}
                  >
                    <ArrowDownUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'slider':
        return (
          <div>
            <div className="flex justify-between mb-1 text-xs text-gray-500">
              <span>Low</span>
              <span>High</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={(e) =>
                !readOnly && setSliderValue(parseInt(e.target.value))
              }
              className="w-full"
              disabled={readOnly}
            />
            <div className="text-center mt-1">
              <span className="text-sm font-medium">{sliderValue}%</span>
            </div>
          </div>
        );

      case 'matrix':
        return (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-1"></th>
                <th className="text-center p-1">Poor</th>
                <th className="text-center p-1">Fair</th>
                <th className="text-center p-1">Good</th>
                <th className="text-center p-1">Excellent</th>
              </tr>
            </thead>
            <tbody>
              {question.options
                ? question.options.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      <td className="p-1">{row}</td>
                      {[1, 2, 3, 4].map((col) => (
                        <td key={col} className="text-center p-1">
                          <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                            {col === 3 && rowIndex === 0 ? (
                              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                            ) : null}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))
                : ['Feature 1', 'Feature 2', 'Feature 3'].map(
                    (row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        <td className="p-1">{row}</td>
                        {[1, 2, 3, 4].map((col) => (
                          <td key={col} className="text-center p-1">
                            <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                              {col === 3 && rowIndex === 0 ? (
                                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                              ) : null}
                            </div>
                          </td>
                        ))}
                      </tr>
                    )
                  )}
            </tbody>
          </table>
        );

      case 'semantic':
        return (
          <div className="space-y-3">
            {[
              ['Confusing', 'Clear'],
              ['Slow', 'Fast'],
              ['Unattractive', 'Attractive'],
            ].map(([left, right], index) => (
              <div key={index} className="grid grid-cols-7 items-center gap-1">
                <span className="text-xs text-right">{left}</span>
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex justify-center">
                    <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                      {n === 3 && index === 0 ? (
                        <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      ) : null}
                    </div>
                  </div>
                ))}
                <span className="text-xs">{right}</span>
              </div>
            ))}
          </div>
        );

      case 'star':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-8 w-8 cursor-pointer ${n <= starValue ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
                onClick={() => !readOnly && setStarValue(n)}
              />
            ))}
          </div>
        );

      case 'numeric':
        return (
          <Input
            type="number"
            placeholder="Enter a number"
            value={value || ''}
            onChange={(e) => !readOnly && setValue(e.target.value)}
            disabled={readOnly}
          />
        );

      case 'datetime':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => !readOnly && setValue(e.target.value)}
            disabled={readOnly}
          />
        );

      case 'toggle':
        return (
          <div className="flex justify-between items-center">
            <Label htmlFor={`${question.id}-toggle`}>Yes/No</Label>
            <Switch
              id={`${question.id}-toggle`}
              checked={value}
              onCheckedChange={(checked) => !readOnly && setValue(checked)}
              disabled={readOnly}
            />
          </div>
        );

      case 'text':
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={value || ''}
            onChange={(e) => !readOnly && setValue(e.target.value)}
            disabled={readOnly}
          />
        );

      case 'file':
        return (
          <div className="border border-dashed border-gray-300 rounded-md px-6 py-8 text-center">
            <Upload className="mx-auto h-8 w-8 text-gray-400" />
            <div className="mt-2 text-sm text-gray-600">
              Click to upload or drag and drop
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Supports images, documents and PDFs
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="grid grid-cols-2 gap-2">
            {[1, 2].map((n) => (
              <div
                key={n}
                className={`border rounded-md p-1 cursor-pointer ${n === 1 ? 'border-blue-500 bg-blue-50' : ''}`}
              >
                <div className="bg-gray-200 w-full h-16 rounded flex items-center justify-center">
                  <span className="text-xs text-gray-500">Image {n}</span>
                </div>
                <div className="mt-1 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full border inline-flex items-center justify-center">
                    {n === 1 ? (
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'constant-sum':
        return (
          <div>
            <div className="space-y-2">
              {['Option 1', 'Option 2', 'Option 3'].map((option, index) => (
                <div key={index} className="flex items-center">
                  <span className="text-sm w-24">{option}</span>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-16"
                    defaultValue={(100 / 3).toFixed(0)}
                    disabled={readOnly}
                  />
                  <span className="ml-1 text-xs">points</span>
                </div>
              ))}
            </div>
            <div className="text-right mt-2 text-sm font-medium">
              Total: 100/100
            </div>
          </div>
        );

      case 'heatmap':
        return (
          <div className="border bg-gray-100 w-full h-28 rounded relative cursor-pointer">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-gray-500">
                Click anywhere on this image
              </span>
            </div>
            <div className="absolute top-1/3 left-1/4 w-4 h-4 rounded-full bg-blue-500 opacity-50"></div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500 italic">
            Preview not available for this question type
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-start">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {question.questionText}
            {question.isRequired && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </p>
        </div>
      </div>
      <div className="pl-2">{renderQuestion()}</div>
    </div>
  );
}
