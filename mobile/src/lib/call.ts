import { Alert, Platform } from 'react-native';

/**
 * Every call / text / chat in the prototype goes through here. Nothing ever dials:
 * a stray tap on "Call 000" in front of investors must not ring emergency services.
 * TODO(safegate): a real build uses Linking.openURL(`tel:…`) behind the OS dialler.
 */
function demoAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    // RN Alert is a no-op on web.
    globalThis.alert?.(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export function callNumber(number: string, name?: string) {
  demoAlert('Demo only', `In the real app this would call ${name ? `${name} on ` : ''}${number}.`);
}

export function contact(kind: 'call' | 'text' | 'chat' | 'message', who: string) {
  const verb = { call: 'call', text: 'text', chat: 'open a chat with', message: 'send a message to' }[kind];
  demoAlert('Demo only', `In the real app this would ${verb} ${who}.`);
}

export function demoOnly(what: string) {
  demoAlert('Demo only', what);
}
