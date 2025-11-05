import React from 'react';
import "react-native-get-random-values";
import "react-native-url-polyfill/auto";
import { NavigationContainer } from '@react-navigation/native';
// Importe seu arquivo de rotas (RoutesComponent)
import Routes from './src/routes/route'; // Ajuste o caminho se necessário

export default function App() {
  return (
    // Se você estiver usando React Navigation, você precisa do NavigationContainer
    <NavigationContainer>
      <Routes /> 
    </NavigationContainer>
  );
}