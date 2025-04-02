import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Página não encontrada</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Desculpe, a página que você está procurando não existe ou pode ter sido movida.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/dashboard">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">
              Voltar para o Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
