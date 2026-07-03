import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:google_sign_in/google_sign_in.dart';

// ĐÃ CHỐT SANG NODE.JS (CỔNG 5000)
final String backendBaseUrl = kIsWeb 
    ? 'http://localhost:5000' 
    : 'http://10.0.2.2:5000';

final GoogleSignIn googleSignIn = GoogleSignIn(
  clientId: '1021190295168-vsv0rk0pmnq169f4ru3msve4v8oi1js2.apps.googleusercontent.com',
  scopes: ['email', 'profile'],
);

String getUserAvatarUrl(Map<String, dynamic> userData) {
  if (userData.isEmpty) return 'https://ui-avatars.com/api/?name=User&background=random&color=fff&format=png';

  String fullName = userData['name'] ?? userData['full_name'] ?? 'User';
  String tempAvatar = userData['picture'] ?? userData['avatar'] ?? '';

  if (tempAvatar.isNotEmpty) {
    if (tempAvatar.contains('uploads/avatars/')) {
      return '$backendBaseUrl/$tempAvatar';
    }
    if (tempAvatar.startsWith('http')) {
      return tempAvatar;
    }
  }
  return 'https://ui-avatars.com/api/?name=${Uri.encodeComponent(fullName)}&background=random&color=fff&format=png';
}