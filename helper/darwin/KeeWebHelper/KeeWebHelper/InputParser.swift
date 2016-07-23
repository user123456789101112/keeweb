import Foundation

class InputParser {
    class func next() -> InputCommandBase? {
        let maybeStr = readLine()
        if let str = maybeStr {
            let parts = str.characters.split(" ", maxSplit: 1)
            let cmd = String(parts[0])
                .stringByTrimmingCharactersInSet(NSCharacterSet.whitespaceAndNewlineCharacterSet())
            if cmd.characters.count == 0 {
                return NoOpCommand()
            }
            let cmdArg: String? = parts.count > 1 ? String(parts[1]) : nil
            switch cmd {
            case "exit":
                return nil
            case "key":
                return cmdArg != nil ? parseSendKeyCommand(cmdArg!) : NoOpCommand()
            case "text":
                return cmdArg != nil ? SendTextCommand(text: cmdArg!) : NoOpCommand()
            case "copypaste":
                return cmdArg != nil ? CopyPasteCommand(text: String(parts[1])) : NoOpCommand()
            case "wait":
                let interval = cmdArg != nil ? UInt32(cmdArg!) : nil
                return interval != nil ? WaitCommand(interval: interval!) : NoOpCommand()
            default:
                return UnknownCommand(name: cmd)
            }
        }
        return nil
    }
    
    class func parseSendKeyCommand(text: String) -> InputCommandBase? {
        if text.characters.count == 0 {
            return NoOpCommand()
        }
        var modifiers = ModifierKeys()
        var keyText = text
        let firstChar = text.characters.first!
        if firstChar < "0" || firstChar > "9" {
            switch firstChar {
            case "^":
                modifiers.insert(ModifierKeys.ctrl)
            case "+":
                modifiers.insert(ModifierKeys.shift)
            case "%":
                modifiers.insert(ModifierKeys.alt)
            case "@":
                modifiers.insert(ModifierKeys.cmd)
            default:
                fputs("Bad modifier: \(firstChar)\n", stderr)
                return NoOpCommand()
            }
            keyText = text.substringFromIndex(text.startIndex.advancedBy(1))
        }
        let keyCode = UInt16(keyText)
        if keyCode == nil {
            fputs("Bad key code: \(keyCode)\n", stderr)
            return NoOpCommand()
        }
        return SendKeyCommand(key: keyCode!, modifiers: modifiers)
    }
}
