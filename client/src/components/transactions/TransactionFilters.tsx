import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TransactionFiltersProps {
  onApplyFilters: (filters: {
    type: string;
    dateFrom: string;
    dateTo: string;
  }) => void;
}

const TransactionFilters = ({ onApplyFilters }: TransactionFiltersProps) => {
  const [type, setType] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApplyFilters({
      type,
      dateFrom,
      dateTo,
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type" className="w-full">
                  <SelectValue placeholder="All Transactions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="earned">Points Earned</SelectItem>
                  <SelectItem value="redeemed">Points Redeemed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full">
                Apply Filters
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default TransactionFilters;
