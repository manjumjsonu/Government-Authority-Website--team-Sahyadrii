# SMS Templates

## Guidelines
- Maximum 160 characters per SMS
- DND compliant (informational only, no promotional content)
- Clear and concise
- Include helpline number
- Support multiple languages (Kannada, Hindi, English)

## English Templates

### Single Crop
```
Ragi ₹28/kg. Token at Hobli office. Helpline: 1800-XXX-XXXX
```

### Multiple Crops
```
Ragi ₹28/kg, Rice ₹25/kg, Wheat ₹22/kg. Token at Hobli office. Helpline: 1800-XXX-XXXX
```

### No Prices Available
```
Hello [Name], no crop rates available. Contact Hobli office: 1800-XXX-XXXX
```

### With Scheme Info
```
Ragi ₹28/kg. PM-KISAN scheme active. Token at Hobli office. Helpline: 1800-XXX-XXXX
```

## Kannada Templates (ಕನ್ನಡ)

### Single Crop
```
ರಾಗಿ ₹28/ಕೆಜಿ. ಹೊಬಳಿ ಕಚೇರಿಯಲ್ಲಿ ಟೋಕನ್. ಸಹಾಯ ಸಾಲು: 1800-XXX-XXXX
```

### Multiple Crops
```
ರಾಗಿ ₹28/ಕೆಜಿ, ಅಕ್ಕಿ ₹25/ಕೆಜಿ, ಗೋಧಿ ₹22/ಕೆಜಿ. ಹೊಬಳಿ ಕಚೇರಿಯಲ್ಲಿ ಟೋಕನ್. ಸಹಾಯ ಸಾಲು: 1800-XXX-XXXX
```

### No Prices Available
```
ನಮಸ್ಕಾರ [ಹೆಸರು], ಬೆಲೆ ಲಭ್ಯವಿಲ್ಲ. ಹೊಬಳಿ ಕಚೇರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ: 1800-XXX-XXXX
```

## Hindi Templates (हिंदी)

### Single Crop
```
रागी ₹28/किलो. होबली कार्यालय में टोकन. हेल्पलाइन: 1800-XXX-XXXX
```

### Multiple Crops
```
रागी ₹28/किलो, चावल ₹25/किलो, गेहूं ₹22/किलो. होबली कार्यालय में टोकन. हेल्पलाइन: 1800-XXX-XXXX
```

### No Prices Available
```
नमस्ते [नाम], दर उपलब्ध नहीं. होबली कार्यालय से संपर्क करें: 1800-XXX-XXXX
```

## Template Variables

- `[Name]` - Farmer's name
- `[CropPrices]` - List of crop prices
- `[Helpline]` - Helpline number (1800-XXX-XXXX)
- `[HobliOffice]` - Hobli office contact

## Implementation Notes

The SMS composition function in `twilio.tsx` automatically:
1. Formats crop prices
2. Truncates to 160 characters if needed
3. Adds helpline number
4. Handles multiple crops

To add language support, modify the `composeSMS` function to detect farmer's preferred language and use appropriate template.

