import { useState, useRef, useEffect } from "react";
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  CircularProgress,
  Avatar,
  useTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import PersonIcon from "@mui/icons-material/Person";
import DashboardLayout from "../../components/DashboardLayout";
import useAdminAuth from "../../hooks/useAdminAuth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.fapmendoza.online";

export default function AgentePage() {
  useAdminAuth();
  const theme = useTheme();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hola! Soy FAPY, tu asistente de FAP Mendoza. Puedo buscar candidatos, ver ofertas, armar grupos para mailing, y mucho mas. Que necesitas?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-fill from service request redirect
  useEffect(() => {
    const preMsg = localStorage.getItem("agentPreMessage");
    if (preMsg) {
      localStorage.removeItem("agentPreMessage");
      setInput(preMsg);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("adminToken");
      const res = await fetch(`${API_URL}/api/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) throw new Error("Error en la respuesta del agente");

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Hubo un error al procesar tu consulta. Intenta de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <DashboardLayout>
      <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)", p: 2 }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: "text.primary" }}>
          FAPY
        </Typography>

        {/* Messages area */}
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            overflow: "auto",
            p: 2,
            mb: 2,
            bgcolor: "background.default",
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
          }}
        >
          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} theme={theme} />
          ))}
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, ml: 1 }}>
              <CircularProgress size={18} color="primary" />
              <Typography variant="body2" color="text.secondary">
                Pensando...
              </Typography>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Paper>

        {/* Input area */}
        <Paper
          elevation={2}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            borderRadius: 3,
          }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Escribi tu consulta... (ej: busca candidatos de gastronomia)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{ disableUnderline: true }}
            sx={{ px: 1 }}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            sx={{
              bgcolor: "primary.main",
              color: "#fff",
              "&:hover": { bgcolor: "primary.dark" },
              "&:disabled": { bgcolor: "action.disabledBackground" },
            }}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </DashboardLayout>
  );
}

function MessageBubble({ message, theme }) {
  const isUser = message.role === "user";

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        mb: 2,
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
      }}
    >
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: isUser ? "secondary.main" : "primary.main",
          fontSize: 16,
        }}
      >
        {isUser ? <PersonIcon fontSize="small" /> : <SupportAgentIcon fontSize="small" />}
      </Avatar>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          maxWidth: "75%",
          borderRadius: 2,
          bgcolor: isUser
            ? theme.palette.secondary.main
            : theme.palette.background.paper,
          color: isUser ? "#fff" : "text.primary",
          border: isUser ? "none" : `1px solid ${theme.palette.divider}`,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
      >
        {message.content}
      </Paper>
    </Box>
  );
}
