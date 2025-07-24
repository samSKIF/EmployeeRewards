import { Product } from '@shared/schema';
import { Link } from 'wouter';

interface RewardCardProps {
  product: Product;
}

const RewardCard = ({ product }: RewardCardProps) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      <img
        src={product.imageUrl}
        alt={product.name}
        className="w-full h-32 object-cover"
      />
      <div className="p-4">
        <h3 className="text-sm font-semibold text-gray-800">{product.name}</h3>
        <p className="text-xs text-gray-500 mt-1">{product.description}</p>
        <div className="mt-3 flex justify-between items-center">
          <span className="text-sm font-bold text-primary">
            {product.points} points
          </span>
          <Link href="/shop">
            <button className="text-xs bg-primary hover:bg-indigo-700 text-white py-1 px-3 rounded transition-colors">
              View
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RewardCard;
