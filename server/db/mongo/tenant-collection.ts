import type { Db, Collection, Filter, Document, OptionalUnlessRequiredId, InsertOneResult, UpdateFilter, UpdateResult } from 'mongodb';

export function tCollection<T extends Document>(db: Db, name: string, tenantId: string) {
  const coll: Collection<T> = db.collection<T>(name);

  return {
    find(filter: Filter<T> = {}, options?: any) {
      return coll.find({ ...filter, tenant_id: tenantId } as Filter<T>, options);
    },
    findOne(filter: Filter<T> = {}, options?: any) {
      return coll.findOne({ ...filter, tenant_id: tenantId } as Filter<T>, options);
    },
    insertOne(doc: OptionalUnlessRequiredId<T>, options?: any): Promise<InsertOneResult<T>> {
      return coll.insertOne({ ...doc, tenant_id: tenantId } as OptionalUnlessRequiredId<T>, options);
    },
    updateOne(filter: Filter<T>, update: UpdateFilter<T>, options?: any): Promise<UpdateResult> {
      return coll.updateOne({ ...filter, tenant_id: tenantId } as Filter<T>, update, options);
    },
    raw(): Collection<T> { return coll; } // escape hatch
  };
}