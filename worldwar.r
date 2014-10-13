# R

costs <- c(25,220,800,4000,30000,90000,150000,500000)
increaseCost <- costs*.1
incomes <- c(1,6.5,16.5,56,270,500,700,1200)
bought <- c(0,0,0,0,0,0,0,0)
# mask <- c(TRUE,TRUE,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE)
# mask <- c(TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE)
# mask <- c(FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE)
mask <- c(FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE)
costs[!mask] <- Inf

money<-min(costs)
income<-0

moneySeries<-c()
output<-list()
maxIter <- 24*1000
output[[1]]<-matrix(0,maxIter,length(money))
output[[1]][1,]<-money
output[[2]]<-matrix(0,maxIter,length(income))
output[[2]][1,]<-income
output[[3]]<-matrix(0,maxIter,length(bought))
output[[3]][1,]<-bought
output[[4]]<-matrix(0,maxIter,length(costs/income))
output[[4]][1,]<-costs/income
output[[5]]<-matrix(0,maxIter,length(incomes/(costs/income)))
output[[5]][1,]<-incomes/(costs/income)

for(i in 1:maxIter) {
  money <- money+income
  roi <- incomes/costs
  bestType <- sort(roi,index.return=TRUE,decreasing=TRUE)$ix[1]
  theCost <- costs[bestType]
  #cat(sprintf("%d: $%g, inc $%g cost $%g\n", i,money,income,theCost))
  while(money >= theCost) {
    bought[bestType] <- bought[bestType]+1
    money <- money-theCost
    income <- income + incomes[bestType]
    costs[bestType] <- costs[bestType]+increaseCost[bestType]

    roi <- incomes/costs
    bestType <- sort(roi,index.return=TRUE,decreasing=TRUE)$ix[1]
    theCost <- costs[bestType]
  }
  output[[1]][i,] <- money
  output[[2]][i,] <- income
  output[[3]][i,] <- bought
  output[[4]][i,] <- costs/income
  output[[5]][i,] <- incomes/(costs/income)
#   cat(sprintf("%g\n",1/roi[bestType]/24))
}
#output


plot((1:nrow(output[[1]]))/24,output[[1]][,1],type='l')
plot((1:nrow(output[[2]]))/24,output[[2]][,1],type='l')

plot((1:nrow(output[[3]]))/24,output[[3]][,1],type='l',ylim=range(output[[3]]))
for(k in 1:ncol(output[[3]])) {
  points((1:nrow(output[[3]]))/24,output[[3]][,k],type='l',col=k)
}

plot((1:nrow(output[[4]]))/24,output[[4]][,1],type='l')
for(k in 1:ncol(output[[4]])) {
  points((1:nrow(output[[4]]))/24,output[[4]][,k],type='l',col=k)
}

plot((1:nrow(output[[5]]))/24,output[[5]][,1],type='l',ylim=range(output[[5]]))
for(k in 1:ncol(output[[5]])) {
  points((1:nrow(output[[5]]))/24,output[[5]][,k],type='l',col=k)
}

output[,10000]

incomes/costs




