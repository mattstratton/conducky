import { createContext } from 'react';

export interface ModalContextType {
  openModal: (slug: string, name?: string) => void;
}

export const ModalContext = createContext<ModalContextType>({ openModal: () => {} }); 