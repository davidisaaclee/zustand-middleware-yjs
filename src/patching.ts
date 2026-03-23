import * as Y from "yjs";
import { ChangeType, Change, } from "./types";
import { getChanges, } from "./diff";
import { arrayToYArray, isPlainObject, objectToYMap, stringToYText, } from "./mapping";
import { StoreApi, } from "zustand/vanilla";

const isYSharedType = (v: unknown): v is Y.Map<any> | Y.Array<any> | Y.Text =>
  v instanceof Y.Map || v instanceof Y.Array || v instanceof Y.Text;

/** Convert a plain JS value to the appropriate Yjs shared type. */
const valueToYType = (
  value: any,
  isAtomic: (path: string[]) => boolean,
  path: string[]
): any =>
{
  if (typeof value === "string")
    return stringToYText(value);
  else if (value instanceof Array)
    return arrayToYArray(value, isAtomic, path);
  else if (isPlainObject(value))
    return objectToYMap(value, isAtomic, path);
  else
    return value;
};

/**
 * Diffs sharedType and newState to create a list of changes for transforming
 * the contents of sharedType into that of newState. For every nested, 'pending'
 * change detected, this function recurses, as a nested object or array is
 * represented as a Y.Map or Y.Array.
 *
 * @param sharedType The Yjs shared type to patch.
 * @param newState The new state to patch the shared type into.
 */
export const patchSharedType = (
  sharedType: Y.Map<any> | Y.Array<any> | Y.Text,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  newState: any,
  isAtomic: (path: string[]) => boolean = () => false,
  path: string[] = []
): void =>
{
  const changes = getChanges(sharedType.toJSON(), newState, isAtomic, path);

  changes.forEach(([ type, property, value ]) =>
  {
    switch (type)
    {
    case ChangeType.INSERT:
    case ChangeType.UPDATE:
      if ((value instanceof Function) === false)
      {
        if (sharedType instanceof Y.Map)
        {
          const prop = property as string;
          const currentPath = [ ...path, prop ];

          if (isAtomic(currentPath))
            sharedType.set(prop, value);
          else if (typeof value === "string")
            sharedType.set(prop, stringToYText(value));
          else if (value instanceof Array)
            sharedType.set(prop, arrayToYArray(value, isAtomic, currentPath));
          else if (isPlainObject(value))
            sharedType.set(prop, objectToYMap(value, isAtomic, currentPath));
          else
            sharedType.set(prop, value);
        }

        else if (sharedType instanceof Y.Array)
        {
          const index = property as number;
          const currentPath = [ ...path, String(index) ];

          if (type === ChangeType.UPDATE)
            sharedType.delete(index);

          if (isAtomic(currentPath))
            sharedType.insert(index, [ value ]);
          else if (typeof value === "string")
            sharedType.insert(index, [ stringToYText(value) ]);
          else if (value instanceof Array)
            sharedType.insert(index, [ arrayToYArray(value, isAtomic, currentPath) ]);
          else if (isPlainObject(value))
            sharedType.insert(index, [ objectToYMap(value, isAtomic, currentPath) ]);
          else
            sharedType.insert(index, [ value ]);
        }

        else if (sharedType instanceof Y.Text)
          sharedType.insert(property as number, value);
      }
      break;

    case ChangeType.DELETE:
      if (sharedType instanceof Y.Map)
        sharedType.delete(property as string);

      else if (sharedType instanceof Y.Array)
      {
        const index = property as number;
        sharedType.delete(sharedType.length <= index
          ? sharedType.length - 1
          : index);
      }

      else if (sharedType instanceof Y.Text)
        // A delete operation for text is only ever for a single character.
        sharedType.delete(property as number, 1);

      break;

    case ChangeType.PENDING:
      if (sharedType instanceof Y.Map)
      {
        const prop = property as string;
        const currentPath = [ ...path, prop ];

        if (isAtomic(currentPath))
        {
          // Atomic: bypass CRDT merge, replace the whole value directly.
          sharedType.set(prop, newState[prop]);
        }
        else
        {
          const child = sharedType.get(prop);
          if (isYSharedType(child))
          {
            patchSharedType(child, newState[prop], isAtomic, currentPath);
          }
          else
          {
            // Child is not a Yjs shared type (e.g. a plain object stored
            // directly in the Y.Map). Replace it with a proper shared type.
            sharedType.set(prop, valueToYType(newState[prop], isAtomic, currentPath));
          }
        }
      }
      else if (sharedType instanceof Y.Array)
      {
        const index = property as number;
        const currentPath = [ ...path, String(index) ];

        if (isAtomic(currentPath))
        {
          sharedType.delete(index);
          sharedType.insert(index, [ newState[index] ]);
        }
        else
        {
          const child = sharedType.get(index);
          if (isYSharedType(child))
          {
            patchSharedType(child, newState[index], isAtomic, currentPath);
          }
          else
          {
            // Child is not a Yjs shared type. Replace it with a proper one.
            sharedType.delete(index);
            sharedType.insert(index, [ valueToYType(newState[index], isAtomic, currentPath) ]);
          }
        }
      }
      break;

    default:
      break;
    }
  });
};

/**
 * Patches oldState to be identical to newState. This function recurses when
 * an array or object is encountered. If oldState and newState are already
 * identical (indicated by an empty diff), then oldState is returned.
 *
 * @param oldState The state we want to patch.
 * @param newState The state we want oldState to match after patching.
 *
 * @returns The patched oldState, identical to newState.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const patchState = (
  oldState: any,
  newState: any,
  isAtomic: (path: string[]) => boolean = () => false
): any =>
{
  const changes = getChanges(oldState, newState, isAtomic);

  const applyChanges = (
    state: (string | any[] | Record<string, any>),
    changes: Change[]
  ): any =>
  {
    if (typeof state === "string")
      return applyChangesToString(state as string, changes);
    else if (state instanceof Array)
      return applyChangesToArray(state as any[], changes);
    else if (state instanceof Object)
      return applyChangesToObject(state as Record<string, any>, changes);
  };

  const applyChangesToArray = (array: any[], changes: Change[]): any =>
    changes
      .sort(([ , indexA ], [ , indexB ]) =>
        Math.sign((indexA as number) - (indexB as number)))
      .reduce(
        (revisedArray, [ type, index, value ]) =>
        {
          switch (type)
          {
          case ChangeType.INSERT:
          {
            revisedArray.splice(index as number, 0, value);
            return revisedArray;
          }

          case ChangeType.UPDATE:
          {
            revisedArray[index as number] = value;
            return revisedArray;
          }

          case ChangeType.PENDING:
          {
            revisedArray[index as number] =
              applyChanges(array[index as number], value);
            return revisedArray;
          }

          case ChangeType.DELETE:
          {
            revisedArray.splice(index as number, 1);
            return revisedArray;
          }

          case ChangeType.NONE:
          default:
            return revisedArray;
          }
        },
        array
      );

  const applyChangesToObject = (
    object: Record<string, any>,
    changes: Change[]
  ): any =>
    changes
      .reduce(
        (revisedObject, [ type, property, value ]) =>
        {
          switch (type)
          {
          case ChangeType.INSERT:
          case ChangeType.UPDATE:
          {
            revisedObject[property] = value;
            return revisedObject;
          }

          case ChangeType.PENDING:
          {
            revisedObject[property] = applyChanges(object[property], value);
            return revisedObject;
          }

          case ChangeType.DELETE:
          {
            delete revisedObject[property];
            return revisedObject;
          }

          case ChangeType.NONE:
          default:
            return revisedObject;
          }
        },
        object as Record<string, any>
      );

  const applyChangesToString = (string: string, changes: Change[]): any =>
    changes
      .reduce(
        (revisedString, [ type, index, value ]) =>
        {
          switch (type)
          {
          case ChangeType.INSERT:
          {
            const left = revisedString.slice(0, index as number);
            const right = revisedString.slice(index as number);
            return left + value + right;
          }

          case ChangeType.DELETE:
          {
            const left = revisedString.slice(0, index as number);
            const right = revisedString.slice((index as number) + 1);
            return left + right;
          }

          default:
          {
            return revisedString;
          }
          }
        },
        string
      );

  if (changes.length === 0)
    return oldState;

  else
    return applyChanges(oldState, changes);
};


/**
 * Diffs the current state stored in the Zustand store and the given newState.
 * The current Zustand state is patched into the given new state recursively.
 *
 * @param store The Zustand API that manages the store we want to patch.
 * @param newState The new state that the Zustand store should be patched to.
 */
export const patchStore = <S extends unknown>(
  store: StoreApi<S>,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  newState: any,
  isAtomic: (path: string[]) => boolean = () => false
): void =>
{
  // Clone the oldState instead of using it directly from store.getState().
  const oldState = {
    ...(store.getState() as Record<string, unknown>),
  };

  store.setState(
    patchState(oldState, newState, isAtomic),
    true // Replace with the patched state.
  );
};