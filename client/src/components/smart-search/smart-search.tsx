import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface SmartSearchProps {
  className?: string;
  placeholder?: string;
}

interface SearchResult {
  // Generic result fields
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  
  // Proposta fields
  clientId?: number;
  value?: string | number;
  status?: string;
  
  // Reference fields
  client?: any;
  product?: any;
}

export function SmartSearch({ className, placeholder = 'Busca inteligente...' }: SmartSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search suggestions
  useEffect(() => {
    if (inputValue.length >= 2) {
      setIsLoadingSuggestions(true);
      
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(async () => {
        try {
          const response = await apiRequest('POST', '/api/search/autocomplete', {}, { input: inputValue });
          const data = await response.json();
          
          if (data.suggestions) {
            setSuggestions(data.suggestions);
          }
        } catch (error) {
          console.error('Erro ao buscar sugestões:', error);
          setSuggestions([]);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoadingSuggestions(false);
    }
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue]);

  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchPerformed(true);
    
    try {
      const response = await apiRequest('POST', '/api/search', {}, { query });
      const data = await response.json();
      
      if (data.results) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsPopoverOpen(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    handleSearch(suggestion);
    setIsPopoverOpen(false);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (inputValue.length >= 2) {
      setIsPopoverOpen(true);
    }
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    // Atraso para evitar que o popover feche antes do click na sugestão
    setTimeout(() => setIsPopoverOpen(false), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(inputValue);
      setIsPopoverOpen(false);
    }
  };

  const navigateToResult = (result: SearchResult) => {
    if (result.clientId) {
      // É uma proposta
      navigate(`/proposals/${result.id}`);
    } else if (result.cpf) {
      // É um cliente
      navigate(`/clients/${result.id}`);
    } else {
      // Outro tipo de resultado
      console.log('Tipo de resultado não reconhecido:', result);
    }
  };

  const renderResultItem = (result: SearchResult) => {
    if (result.name) {
      // Cliente
      return (
        <div className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer" 
             onClick={() => navigateToResult(result)}>
          <div className="font-medium">{result.name}</div>
          <div className="text-sm text-gray-500 flex space-x-2">
            {result.phone && <span>{result.phone}</span>}
            {result.email && <span>{result.email}</span>}
            {result.cpf && <span>CPF: {result.cpf}</span>}
          </div>
        </div>
      );
    } else if (result.clientId) {
      // Proposta
      return (
        <div className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
             onClick={() => navigateToResult(result)}>
          <div className="font-medium">
            Proposta: {result.client?.name || `Cliente #${result.clientId}`}
          </div>
          <div className="text-sm text-gray-500 flex space-x-2">
            <span>Valor: R$ {result.value}</span>
            <span>Status: {result.status}</span>
            {result.product && <span>Produto: {result.product.name}</span>}
          </div>
        </div>
      );
    }
    
    // Caso padrão
    return (
      <div className="p-3 border-b border-gray-100">
        <div className="font-medium">Resultado #{result.id}</div>
        <div className="text-sm text-gray-500">
          {JSON.stringify(result).slice(0, 100)}...
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              className="pl-10 pr-4 w-full"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
            />
            {(isLoadingSuggestions || isSearching) && (
              <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
        </PopoverTrigger>
        
        <PopoverContent className="w-[300px] p-0" align="start">
          {suggestions.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
          
          {!isLoadingSuggestions && suggestions.length === 0 && inputValue.length >= 2 && (
            <div className="p-2 text-gray-500">Nenhuma sugestão encontrada</div>
          )}
        </PopoverContent>
      </Popover>
      
      {/* Resultados da busca */}
      {searchPerformed && (
        <Card className="mt-4 shadow-sm">
          <CardContent className="p-0">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-medium">Resultados para: "{inputValue}"</h3>
            </div>
            
            {isSearching ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : results.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto">
                {results.map((result, index) => (
                  <div key={index}>
                    {renderResultItem(result)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>Nenhum resultado encontrado</p>
                <p className="text-sm mt-2">Tente usar termos mais gerais ou uma consulta diferente</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}