// Copied from https://ui.shadcn.com/docs/components/toast
import { useEffect, useState } from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Base toast type
type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: {
        id: string;
        title?: string;
        description?: string;
        action?: React.ReactNode;
        variant?: "default" | "destructive";
      };
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast> & Pick<ToasterToast, "id">;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      addToRemoveQueue(toastId);

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t } : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST:
      if (action.toastId === "all") {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners: Array<(state: State) => void> = [];

let memoryState: State = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

type ToastOptions = Omit<Toast, "id">;

function toast({ ...props }: ToastOptions) {
  const id = genId();

  const update = (props: ToastOptions) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
    },
  });

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState<State>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId: string) => dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast }; 