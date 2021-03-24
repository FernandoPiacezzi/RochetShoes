import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productIsOnCart = cart.find((product) => product.id === productId);

      const { data: stockData } = await api.get(`stock/${productId}`);

      const currentAmountOnCart = productIsOnCart ? productIsOnCart.amount : 0;
      const newAmount = currentAmountOnCart + 1;

      if (currentAmountOnCart >= stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      let cartAux: Product[] = [];

      if (!productIsOnCart) {
        const { data } = await api.get(`products/${productId}`);

        const incrementedAmount = {
          ...data,
          amount: 1,
        };

        cartAux = [...cart, incrementedAmount];
        setCart(cartAux);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartAux));
      } else {
        cartAux = cart.map((product) =>
          product.id === productId
            ? {
                ...product,
                amount: newAmount,
              }
            : product
        );
        setCart(cartAux);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartAux));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (cart.find((product) => product.id === productId)) {
        const cartAux = cart.filter((product) => product.id !== productId);
        setCart(cartAux);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartAux));
      } else {
        throw new Error("Produto não encontrado");
      }
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error("Operação inválida");
        return;
      }
      const { data: stockData } = await api.get(`stock/${productId}`);

      if (amount >= stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      } else {
        const cartAux = cart.map((product) =>
          product.id === productId
            ? {
                ...product,
                amount: amount,
              }
            : product
        );

        setCart(cartAux);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartAux));
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
