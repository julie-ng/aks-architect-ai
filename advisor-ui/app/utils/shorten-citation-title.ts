/**
 * Simplifies verbose documentation titles for citation display.
 * Strips common suffixes and replaces long Azure service names with abbreviations.
 */
export function shortenCitationTitle (title: string): string {
  let result = title

  // Strip trailing suffixes
  const suffixes = [
    ' - Microsoft Learn',
    ' | Microsoft Learn',
    ' - Azure Architecture Center',
    ' - Azure Kubernetes Service',
    ' - Azure',
  ]
  for (const suffix of suffixes) {
    if (result.endsWith(suffix)) {
      result = result.slice(0, -suffix.length)
    }
  }

  // Replace verbose Azure service names with abbreviations
  const replacements: [RegExp, string][] = [
    [/Azure Kubernetes Service \(AKS\)/g, 'AKS'],
    [/Azure Kubernetes Service/g, 'AKS'],
    [/Azure Container Registry \(ACR\)/g, 'ACR'],
    [/Azure Container Registry/g, 'ACR'],
    [/Azure Key Vault/g, 'Key Vault'],
    [/Azure Virtual Network/g, 'VNet'],
    [/Azure Application Gateway/g, 'App Gateway'],
  ]

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement)
  }

  return result.trim()
}
