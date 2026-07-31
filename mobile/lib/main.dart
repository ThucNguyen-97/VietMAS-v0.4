import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:8000');

void main() => runApp(const VietMasApp());

class VietMasApp extends StatelessWidget {
  const VietMasApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(title: 'VietMAS', theme: ThemeData(colorSchemeSeed: Colors.deepOrange, useMaterial3: true), home: const LoginPage());
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final username = TextEditingController(text: 'manager');
  final password = TextEditingController(text: 'manager123');
  bool loading = false;
  String error = '';

  Future<void> login() async {
    setState(() { loading = true; error = ''; });
    try {
      final response = await http.post(Uri.parse('$apiBaseUrl/auth/login'), headers: {'Content-Type': 'application/json'}, body: jsonEncode({'username': username.text.trim(), 'password': password.text}));
      if (response.statusCode != 200) throw Exception();
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      if (!mounted) return;
      Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => ChatPage(token: data['access_token'] as String)));
    } catch (_) { setState(() => error = 'Sai tài khoản/mật khẩu hoặc không thể kết nối máy chủ.'); }
    finally { if (mounted) setState(() => loading = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('VietMAS')),
    body: Center(child: SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Text('Đăng nhập', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          TextField(controller: username, decoration: const InputDecoration(labelText: 'Tài khoản', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Mật khẩu', border: OutlineInputBorder())),
          const SizedBox(height: 12),
          if (error.isNotEmpty) Text(error, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          const SizedBox(height: 12),
          FilledButton(onPressed: loading ? null : login, child: Text(loading ? 'Đang đăng nhập...' : 'Đăng nhập')),
        ]),
      ),
    )),
  );
}

class ChatPage extends StatefulWidget {
  const ChatPage({super.key, required this.token});
  final String token;
  @override
  State<ChatPage> createState() => _ChatPageState();
}

class _ChatPageState extends State<ChatPage> {
  final controller = TextEditingController();
  final messages = <Map<String, String>>[];
  bool loading = false;

  Future<void> send() async {
    final text = controller.text.trim();
    if (text.isEmpty || loading) return;
    setState(() { messages.add({'sender': 'user', 'text': text}); controller.clear(); loading = true; });
    try {
      final response = await http.post(Uri.parse('$apiBaseUrl/chat/message'), headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ${widget.token}'}, body: jsonEncode({'message': text}));
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      setState(() => messages.add({'sender': 'assistant', 'text': data['reply']?.toString() ?? 'Không có phản hồi'}));
    } catch (_) {
      setState(() => messages.add({'sender': 'assistant', 'text': 'Không thể kết nối tới máy chủ.'}));
    } finally { setState(() => loading = false); }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('VietMAS Chatbot')),
    body: Column(children: [
      Expanded(child: ListView.builder(padding: const EdgeInsets.all(16), itemCount: messages.length, itemBuilder: (_, i) => Align(alignment: messages[i]['sender'] == 'user' ? Alignment.centerRight : Alignment.centerLeft, child: Card(child: Padding(padding: const EdgeInsets.all(12), child: Text(messages[i]['text']!))))),),
      if (loading) const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
      SafeArea(child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [Expanded(child: TextField(controller: controller, onSubmitted: (_) => send(), decoration: const InputDecoration(hintText: 'Nhập yêu cầu kho...', border: OutlineInputBorder()))), const SizedBox(width: 8), IconButton.filled(onPressed: send, icon: const Icon(Icons.send))])))
    ]),
  );
}
