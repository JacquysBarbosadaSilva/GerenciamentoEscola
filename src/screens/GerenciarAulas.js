import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Modal,
    TextInput,
    Alert,
    ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScanCommand, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dynamoDB from "../../awsConfig";

const TURMAS_TABLENAME = "turmas";
const ATIVIDADES_TABLENAME = "atividades";

// PALETA DE CORES CONSISTENTE (Do GerenciarUsuarios)
const COLORS = {
    background: "#11274d", // Azul Escuro (Fundo principal)
    cardBackground: "#fff", // Branco (Fundo dos cards e modal)
    inputBackground: "#f0f0f0", // Cinza Claro (Fundo dos inputs)
    primary: "#63b8ff", // Azul Vibrante (Botão principal/Salvar)
    accent: "#F2BE5B", // Amarelo/Laranja (Destaque/Edição)
    danger: "#E74C3C", // Vermelho (Exclusão)
    textDark: "#11274d", // Texto Escuro
    textLight: "#333", // Texto Secundário
};

const formatNumero = (index) => String(index + 1).padStart(2, "0");

export default function GerenciarAulas({ navigation }) {
    // --- ESTADOS (ORIGINAIS) ---
    const [usuarioLogado, setUsuarioLogado] = useState(null);
    const [loading, setLoading] = useState(true);

    const [turmas, setTurmas] = useState([]);
    const [turmaSelecionada, setTurmaSelecionada] = useState(null);

    const [atividades, setAtividades] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [descricao, setDescricao] = useState("");
    const [modoEdicao, setModoEdicao] = useState(null);

    const podeGerenciar = usuarioLogado?.tipo === "admin" || usuarioLogado?.tipo === "professor";

    // --- FUNÇÕES DE LÓGICA (ORIGINAIS) ---
    const handleLogout = async (turmaId) => {
        if (!turmaId) {
            Alert.alert("Erro", "Nenhuma turma selecionada para exclusão.");
            return;
        }

        Alert.alert("Excluir Turma", "Tem certeza de que deseja excluir esta turma? Essa ação não pode ser desfeita.", [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Excluir",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);

                        const comando = new DeleteItemCommand({
                            TableName: TURMAS_TABLENAME,
                            Key: {
                                id: { N: String(turmaId) },
                            },
                        });

                        await dynamoDB.send(comando);

                        // Atualiza a lista local de turmas
                        setTurmas((prevTurmas) => prevTurmas.filter((t) => String(t.id) !== String(turmaId)));

                        setTurmaSelecionada(null);
                        Alert.alert("Sucesso", "Turma excluída com sucesso!");
                    } catch (erro) {
                        console.error("Erro ao excluir turma:", erro);
                        Alert.alert("Erro", "Não foi possível excluir a turma.");
                    } finally {
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    const carregarDadosEFiltrarTurmas = useCallback(async () => {
        setLoading(true);

        try {
            const usuarioLogadoString = await AsyncStorage.getItem("usuarioLogado");
            if (!usuarioLogadoString) {
                Alert.alert("Erro de Sessão", "Usuário não logado. Redirecionando.");
                navigation.replace("Login");
                return;
            }

            const user = JSON.parse(usuarioLogadoString);
            setUsuarioLogado(user);

            // 🔍 Busca o registro completo do usuário logado no DynamoDB
            const comandoUser = new ScanCommand({
                TableName: "users",
                FilterExpression: "email = :email",
                ExpressionAttributeValues: {
                    ":email": { S: user.email },
                },
            });

            const resultadoUser = await dynamoDB.send(comandoUser);

            if (!resultadoUser.Items || resultadoUser.Items.length === 0) {
                Alert.alert("Erro", "Usuário não encontrado no banco.");
                return;
            }

            const usuarioBanco = resultadoUser.Items[0];
            const tipoUsuario = usuarioBanco.tipo?.S || "professor";
            const nomeUsuario = usuarioBanco.nome?.S || "Professor";
            const emailUsuario = usuarioBanco.email?.S || "";

            // 🧩 Lógica: Admin → todas as turmas / Professor → apenas as turmas em que ele é o professor
            if (tipoUsuario === "admin") {
                // 🔹 Admin: busca todas as turmas
                const comandoTurmas = new ScanCommand({
                    TableName: TURMAS_TABLENAME,
                });

                const resultadoTurmas = await dynamoDB.send(comandoTurmas);
                const turmasConvertidas = resultadoTurmas.Items.map((item) => ({
                    id: item.id.N,
                    nome: item.nome.S,
                    professorNome: item.professor?.S || "Sem professor",
                    professorEmail: item.professorEmail?.S || "",
                    alunos: item.alunos?.S || "",
                }));

                setTurmas(turmasConvertidas);
                setTurmaSelecionada(null); // Admin escolhe depois
            } else {
                // 👨‍🏫 Professor: busca apenas as turmas vinculadas a ele
                const nomeProfessor = usuarioBanco.nome?.S || "";

                const comandoTurmas = new ScanCommand({
                    TableName: TURMAS_TABLENAME,
                    FilterExpression: "professor = :nome",
                    ExpressionAttributeValues: {
                        ":nome": { S: nomeProfessor },
                    },
                });

                const resultadoTurmas = await dynamoDB.send(comandoTurmas);

                if (!resultadoTurmas.Items || resultadoTurmas.Items.length === 0) {
                    Alert.alert("Atenção", "Nenhuma turma vinculada a você foi encontrada.");
                    setTurmas([]);
                    return;
                }

                const turmasConvertidas = resultadoTurmas.Items.map((item) => ({
                    id: item.id.N,
                    nome: item.nome.S,
                    professorNome: item.professor?.S || nomeUsuario,
                    professorEmail: item.professorEmail?.S || emailUsuario,
                    alunos: item.alunos?.S || "",
                }));

                setTurmas(turmasConvertidas);
                setTurmaSelecionada(null);
            }
        } catch (erro) {
            console.error("Erro ao carregar turmas:", erro);
            Alert.alert("Erro", "Não foi possível carregar as turmas.");
        } finally {
            setLoading(false);
        }
    }, [navigation]);

    const handleSelecionarTurma = (turma) => {
        setTurmaSelecionada(turma);
    };

    const carregarAtividades = useCallback(async (turmaId) => {
        if (!turmaId) return;

        setLoading(true);
        try {
            const comando = new ScanCommand({
                TableName: ATIVIDADES_TABLENAME,
                FilterExpression: "turmaId = :id",
                ExpressionAttributeValues: {
                    ":id": { N: String(turmaId) },
                },
            });

            const resultado = await dynamoDB.send(comando);

            const atividadesFormatadas = resultado.Items.map((item) => ({
                id: item.id?.N,
                turmaId: item.turmaId?.N,
                descricao: item.descricao?.S || "Sem descrição",
            }))
                .filter((ativ) => ativ.id)
                .sort((a, b) => parseInt(a.id) - parseInt(b.id));

            setAtividades(atividadesFormatadas);
        } catch (erro) {
            console.log("Erro ao carregar atividades:", erro);
            Alert.alert("Erro", "Não foi possível carregar as atividades da turma.");
        } finally {
            setLoading(false);
        }
    }, []);

    const salvarAtividade = async () => {
        if (!descricao || !podeGerenciar) {
            Alert.alert("Atenção", "Preencha a descrição e verifique sua permissão.");
            return;
        }

        if (!turmaSelecionada?.id) {
            Alert.alert("Erro", "Nenhuma turma selecionada para salvar a atividade.");
            return;
        }

        setLoading(true);
        const idParaSalvar = String(modoEdicao || Date.now());

        try {
            const comando = new PutItemCommand({
                TableName: ATIVIDADES_TABLENAME,
                Item: {
                    id: { N: idParaSalvar },
                    turmaId: { N: String(turmaSelecionada.id) },
                    descricao: { S: descricao },
                },
            });

            await dynamoDB.send(comando);
            setModalVisible(false);
            setDescricao("");
            setModoEdicao(null);
            carregarAtividades(turmaSelecionada.id);
            Alert.alert("Sucesso", "Atividade salva com sucesso!");
        } catch (erro) {
            console.log("Erro ao salvar atividade:", erro);
            Alert.alert("Erro", "Não foi possível salvar a atividade.");
        } finally {
            setLoading(false);
        }
    };

    const excluirAtividade = (id) => {
        if (!podeGerenciar || !turmaSelecionada?.id) {
            Alert.alert("Permissão Negada", "Você não tem permissão para excluir.");
            return;
        }

        Alert.alert("Confirmar exclusão", `Deseja realmente excluir a atividade ${id}?`, [
            { text: "Cancelar", style: "cancel" },
            {
                text: "Excluir",
                onPress: async () => {
                    try {
                        const comando = new DeleteItemCommand({
                            TableName: ATIVIDADES_TABLENAME,
                            Key: { id: { N: String(id) } },
                        });
                        await dynamoDB.send(comando);
                        carregarAtividades(turmaSelecionada.id);
                        Alert.alert("Sucesso", "Atividade excluída.");
                    } catch (erro) {
                        console.log("Erro ao excluir atividade:", erro);
                        Alert.alert("Erro", "Não foi possível excluir a atividade.");
                    }
                },
            },
        ]);
    };

    const handleOpenModalToCreate = () => {
        if (!podeGerenciar) return;
        setDescricao("");
        setModoEdicao(null);
        setModalVisible(true);
    };

    const handleOpenModalToEdit = (item) => {
        if (!podeGerenciar) return;
        setDescricao(item.descricao);
        setModoEdicao(item.id);
        setModalVisible(true);
    };

    // --- USE EFFECTS (ORIGINAIS) ---
    useEffect(() => {
        carregarDadosEFiltrarTurmas();
    }, [carregarDadosEFiltrarTurmas]);

    useEffect(() => {
        if (turmaSelecionada) {
            carregarAtividades(turmaSelecionada.id);
        }
    }, [turmaSelecionada, carregarAtividades]);

    if (loading && (!usuarioLogado || (turmas.length === 0 && !turmaSelecionada))) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Carregando dados...</Text>
            </View>
        );
    }

    if (!turmaSelecionada && usuarioLogado) {
        return (
            <View style={styles.container}>
                <Text style={styles.mainTitle}>
                    {usuarioLogado?.tipo === "admin" ? "Selecione uma Turma" : `Turma: ${turmaSelecionada?.nome}`}
                </Text>
                {turmaSelecionada && (
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>Professor: {turmaSelecionada.professorNome}</Text>
                        {usuarioLogado?.tipo === "admin" && (
                            <Text style={styles.infoText}>
                                Alunos: {turmaSelecionada.alunos || "Nenhum aluno cadastrado"}
                            </Text>
                        )}
                    </View>
                )}

                {/* Lista de Turmas */}
                <FlatList
                    data={turmas}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.turmaCard} // Novo estilo de card
                            onPress={() => handleSelecionarTurma(item)}
                        >
                            <Ionicons name="school-outline" size={30} color={COLORS.primary} />
                            <View style={{ flex: 1, marginLeft: 15 }}>
                                <Text style={styles.turmaCardTitle}>{item.nome}</Text>
                                <Text style={styles.turmaCardSubtitle}>Professor: {item.professorNome}</Text>
                            </View>
                            <Ionicons name="chevron-forward-outline" size={24} color={COLORS.textLight} />
                        </TouchableOpacity>
                    )}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>
                            Nenhuma turma encontrada para seu perfil. Verifique seu cadastro.
                        </Text>
                    }
                />
                {/* Botão de Logout para a tela de seleção */}
            </View>
        );
    }

    // Renderização do Card de Atividade (VISUAL ATUALIZADO)
    const renderAtividade = ({ item, index }) => (
        <View style={styles.activityCard}>
            <Text style={styles.activityNumber}>{formatNumero(index)}</Text>
            <View style={styles.activityContent}>
                <Text style={styles.activityCardTitle}>{item.descricao}</Text>
            </View>

            {podeGerenciar && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.accent }]}
                        onPress={() => handleOpenModalToEdit(item)}
                    >
                        <Ionicons name="create-outline" size={20} color={COLORS.textDark} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
                        onPress={() => excluirAtividade(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={COLORS.cardBackground} />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    // Estado de Lista de Atividades (Professor/Aluno/Admin após seleção)
    return (
        <View style={styles.container}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                {/* Lógica original: voltar para seleção de turma */}
                <TouchableOpacity onPress={() => setTurmaSelecionada(null)} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
                    <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutFixedButton} onPress={() => handleLogout(turmaSelecionada?.id)}>
                    <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                    <Text style={styles.logoutFixedText}>Excluir Turma</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle}>
                {/* Lógica original para exibir título */}
                {usuarioLogado?.tipo === "aluno" ? "Minhas Atividades" : "Gerenciar Atividades"}
            </Text>

            <Text style={styles.turmaNome}>Turma: {turmaSelecionada.nome}</Text>
            <Text style={styles.professorNome}>Professor: {turmaSelecionada.professorNome}</Text>

            {/* Botão de Adicionar Atividade (Funcionalidade original mantida) */}
            {podeGerenciar && (
                <TouchableOpacity style={styles.addButton} onPress={handleOpenModalToCreate}>
                    <Ionicons name="add-circle" size={24} color={COLORS.textDark} />
                    <Text style={styles.addButtonText}>Cadastrar Atividade</Text>
                </TouchableOpacity>
            )}

            {/* Lista de Atividades */}
            <FlatList
                data={atividades}
                keyExtractor={(item) => item.id}
                renderItem={renderAtividade}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>
                        {loading ? "Carregando..." : "Nenhuma atividade registrada nesta turma."}
                    </Text>
                }
            />

            {/* Modal de criação/edição (Funcionalidade original mantida) */}
            {podeGerenciar && (
                <Modal visible={modalVisible} animationType="slide" transparent>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{modoEdicao ? "Editar Atividade" : "Nova Atividade"}</Text>

                            <TextInput
                                style={styles.input}
                                placeholder="Descrição da Atividade"
                                placeholderTextColor="#777"
                                value={descricao}
                                onChangeText={setDescricao}
                                editable={!loading}
                                multiline
                                numberOfLines={4}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setModalVisible(false)} // Função original
                                    disabled={loading}
                                >
                                    <Text style={styles.cancelText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmButton}
                                    onPress={salvarAtividade} // Função original
                                    disabled={loading || !descricao} // Lógica original
                                >
                                    <Text style={styles.confirmText}>
                                        {loading ? "Salvando..." : modoEdicao ? "Salvar Edição" : "Cadastrar"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            )}
        </View>
    );
}

// --- ESTILOS ATUALIZADOS ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background, // Fundo principal azul escuro
        padding: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    loadingText: { color: COLORS.cardBackground, marginTop: 10, fontSize: 16 },

    // --- Estilos de Título e Informação ---
    mainTitle: {
        fontSize: 28,
        fontWeight: "bold",
        color: COLORS.cardBackground,
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.primary,
        paddingBottom: 10,
        textAlign: "center",
    },
    infoContainer: {
        marginBottom: 15,
        padding: 10,
        backgroundColor: "#1c355e", // Fundo levemente diferente para informações
        borderRadius: 8,
    },
    infoText: {
        color: "#fff",
        fontSize: 14,
    },

    // --- Estilos para Seleção de Turma ---
    turmaCard: {
        backgroundColor: COLORS.cardBackground,
        flexDirection: "row",
        alignItems: "center",
        padding: 18,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 3,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    turmaCardTitle: { fontSize: 18, color: COLORS.textDark, fontWeight: "bold" },
    turmaCardSubtitle: { color: COLORS.textLight, fontSize: 13, marginTop: 4 },
    logoutFixedButton: {
        right: 30,
        backgroundColor: COLORS.cardBackground,
        padding: 10,
        borderRadius: 15,
        flexDirection: "row",
        alignItems: "center",
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 10,
    },
    logoutFixedText: { color: COLORS.danger, marginLeft: 5, fontWeight: "bold" },

    // --- Estilos de Cabeçalho e Botões de Ação ---
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 15,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        padding: 8,
        backgroundColor: COLORS.cardBackground,
        borderRadius: 8,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    backButtonText: {
        color: COLORS.textDark,
        marginLeft: 5,
        fontWeight: "bold",
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: "bold",
        color: COLORS.cardBackground,
        marginBottom: 8,
    },
    turmaNome: {
        fontSize: 18,
        color: COLORS.primary,
        marginBottom: 4,
        fontWeight: "bold",
    },
    professorNome: {
        fontSize: 14,
        color: "#ccc",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#334",
        paddingBottom: 8,
    },
    logoutButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: COLORS.danger,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        shadowOpacity: 0.2,
        elevation: 3,
    },
    addButtonText: {
        color: COLORS.textDark,
        fontSize: 18,
        marginLeft: 8,
        fontWeight: "bold",
    },

    // --- Estilos de Card de Atividade ---
    activityCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        elevation: 4,
        shadowOpacity: 0.1,
    },
    activityNumber: {
        fontSize: 32,
        fontWeight: "800",
        color: COLORS.primary,
        marginRight: 15,
        width: 40,
        textAlign: "center",
    },
    activityContent: {
        flex: 1,
        marginRight: 10,
    },
    activityCardTitle: {
        fontSize: 16,
        color: COLORS.textDark,
        fontWeight: "600",
    },
    actionButtons: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        borderRadius: 8,
        padding: 8,
    },
    emptyText: {
        color: "#ccc",
        textAlign: "center",
        marginTop: 50,
        fontSize: 16,
    },

    // --- Estilos de Modal ---
    modalContainer: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContent: {
        backgroundColor: COLORS.cardBackground,
        width: "90%",
        maxWidth: 400,
        borderRadius: 16,
        padding: 25,
        shadowOpacity: 0.25,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.textDark,
        marginBottom: 16,
        textAlign: "center",
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        color: COLORS.textDark,
        minHeight: 100,
        textAlignVertical: "top",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10,
    },
    cancelButton: {
        backgroundColor: "#ccc",
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
        marginRight: 10,
        alignItems: "center",
    },
    confirmButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flex: 1,
        marginLeft: 10,
        alignItems: "center",
    },
    cancelText: {
        color: COLORS.textDark,
        fontWeight: "bold",
    },
    confirmText: {
        color: "#fff",
        fontWeight: "bold",
    },
});
