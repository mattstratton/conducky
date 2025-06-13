import { createContext } from 'react';

export interface ModalContextType {
  openModal: (...args: any[]) => void;
}

export const ModalContext = createContext<ModalContextType>({ openModal: () => {} }); 