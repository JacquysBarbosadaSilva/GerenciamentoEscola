import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native'; // Hook para carregar dados sempre que a tela focar

export default function Home({ navigation }) {
    const [usuarioLogado, setUsuarioLogado] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Use useFocusEffect para garantir que o estado do usuário seja verificado sempre que a Home for acessada
    useFocusEffect(
        React.useCallback(() => {
            const carregarUsuario = async () => {
                setLoading(true);
                const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
                if (usuarioLogadoString) {
                    const user = JSON.parse(usuarioLogadoString);
                    setUsuarioLogado(user);
                } else {
                    // Se não houver usuário logado, retorna ao login
                    navigation.replace('Login');
                }
                setLoading(false);
            };

            carregarUsuario();
        }, [])
    );

    if (loading || !usuarioLogado) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#2b2d42" />
                <Text style={{ marginTop: 10, color: '#2b2d42' }}>Carregando dados de usuário...</Text>
            </View>
        );
    }
    
    // Desestrutura o tipo para facilitar o acesso
    const { tipo } = usuarioLogado;
    
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Bem-vindo, {usuarioLogado.nome}!</Text>
            
            {/* Botão de Gerenciar Turmas (Visível para Admin e Professor) */}
            {(tipo === 'admin' || tipo === 'professor') && (
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate("Drawer", { screen: "Gerenciar Turmas" })}
                >
                    <Text style={styles.buttonText}>Gerenciar Turmas</Text>
                </TouchableOpacity>
            )}

            {/* ⭐ RESTRIÇÃO: Botão de Gerenciar Usuários (Visível APENAS para Admin) */}
            {tipo === 'admin' && (
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => navigation.navigate("Drawer", { screen: "Gerenciar Usuários" })}
                >
                    <Text style={styles.buttonText}>Gerenciar Usuários</Text>
                </TouchableOpacity>
            )}

            {/* Botão de Gerenciar Aulas (Visível para todos - Aulas/Atividades) */}
            <TouchableOpacity
                style={styles.button}
                onPress={() => navigation.navigate("Drawer", { screen: "Gerenciar Aulas" })} // Ajuste esta navegação!
            >
                <Text style={styles.buttonText}>{tipo === 'aluno' ? 'Minhas Aulas' : 'Gerenciar Aulas/Atividades'}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#edf2f4",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#2b2d42",
        marginBottom: 40,
        textAlign: 'center',
    },
    button: {
        backgroundColor: "#2b2d42",
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        marginVertical: 10,
        width: "80%",
        alignItems: "center",
    },
    buttonText: {
        color: "#edf2f4",
        fontSize: 18,
        fontWeight: "bold",
    },
});