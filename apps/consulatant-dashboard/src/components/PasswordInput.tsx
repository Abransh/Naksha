import { InputHTMLAttributes } from "react";
import Input from "./Input";

export default function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="password" />;
}