import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from "@react-navigation/drawer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

import Login from "../screens/Login";
import Home from "../screens/Home";
import GerenciarTurmas from "../screens/GerenciarTurmas";
import GerenciarUsuarios from "../screens/GerenciarUsuarios";

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const handleLogout = async () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        onPress: async () => {
          await AsyncStorage.removeItem("usuarioLogado");
          props.navigation.replace("Login");
        },
      },
    ]);
  };

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Sair"
        labelStyle={{ color: "red", fontWeight: "bold" }}
        onPress={handleLogout}
      />
    </DrawerContentScrollView>
  );
}

function DrawerRoutes() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: "#2b2d42" },
        headerTintColor: "#fff",
        drawerStyle: { backgroundColor: "#edf2f4" },
        drawerActiveTintColor: "#2b2d42",
      }}
    >
      <Drawer.Screen name="Gerenciar Turmas" component={GerenciarTurmas} />
      <Drawer.Screen name="Gerenciar Usuários" component={GerenciarUsuarios} />
    </Drawer.Navigator>
  );
}

export default function Route() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Home">
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Drawer" component={DrawerRoutes} />
    </Stack.Navigator>
  );
}
